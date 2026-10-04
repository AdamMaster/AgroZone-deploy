import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { PrismaPg } from '@prisma/adapter-pg'
import { writeFileSync } from 'fs'
import { Pool } from 'pg'
import { PrismaClient } from '../src/generated/prisma/client'
import {
  collectReferencedKeys,
  findMissingKeys,
  findOrphanedObjects,
  S3ObjectInfo,
  S3UrlContext
} from '../src/file/utils/s3-keys.util'

// Поиск «осиротевших» файлов в S3 — объектов бакета, на которые не ссылается
// ни одна запись в БД (остались после удаления объявлений/фото/аватаров, пока
// очистка не работала с актуальным форматом ссылок).
//
// По умолчанию скрипт ТОЛЬКО читает: ничего не удаляет и не меняет, пишет
// отчёт и печатает сводку. Удаление включается отдельным флагом --delete.
//
// Запуск на сервере (см. DEPLOY.md — та же схема, что и у остальных
// scripts/*.ts):
//   docker compose -f docker-compose.prod.yml --env-file .env exec server \
//     npm run s3:find-orphans
//
// Параметры (после --):
//   --grace-hours=N  не считать осиротевшими объекты моложе N часов (по
//                    умолчанию 24): защита от файла, который загружен прямо
//                    сейчас, а ссылка на него в БД ещё не записана.
//   --list           напечатать все найденные ключи, а не первые 30.
//   --report=PATH    куда записать полный отчёт JSON (по умолчанию
//                    s3-orphans-report.json в текущей папке).
//   --delete         удалить найденные осиротевшие файлы. Перед этим стоит
//                    прочитать отчёт обычного запуска.
//   --force          разрешить --delete, когда «сирот» больше половины
//                    бакета (обычно это признак проблемы, а не мусора).
//
// Что считается «используемым»: ссылки в User.picture, User.presentationUrl,
// Ad.images, Ad.feedSourceImages (фото дилерских фидов) и Message.attachments.
// Что скрипт НЕ трогает никогда: объекты вне папок приложения (ads/, avatars/,
// presentations/) и объекты моложе окна --grace-hours.

const DEFAULT_GRACE_HOURS = 24
const BATCH_SIZE = 1000
const PREVIEW_LIMIT = 30
const MAX_ORPHAN_SHARE = 0.5

interface Options {
  graceHours: number
  list: boolean
  reportPath: string
  deleteOrphans: boolean
  force: boolean
}

const parseOptions = (args: string[]): Options => {
  const valueOf = (name: string) => args.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3)
  const graceHours = Number(valueOf('grace-hours') ?? DEFAULT_GRACE_HOURS)

  if (!Number.isFinite(graceHours) || graceHours < 0) {
    throw new Error('--grace-hours должен быть неотрицательным числом')
  }

  return {
    graceHours,
    list: args.includes('--list'),
    reportPath: valueOf('report') ?? 's3-orphans-report.json',
    deleteOrphans: args.includes('--delete'),
    force: args.includes('--force')
  }
}

const requireEnv = (name: string) => {
  const value = process.env[name]

  if (!value) throw new Error(`Не задана переменная окружения ${name}`)

  return value
}

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`

  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} МБ`

  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} ГБ`
}

const sumSize = (objects: S3ObjectInfo[]) => objects.reduce((total, object) => total + object.size, 0)

const listAllObjects = async (s3: S3Client, bucket: string): Promise<S3ObjectInfo[]> => {
  const objects: S3ObjectInfo[] = []
  let continuationToken: string | undefined

  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: continuationToken }))

    for (const item of page.Contents ?? []) {
      if (item.Key) {
        objects.push({ key: item.Key, size: item.Size ?? 0, lastModified: item.LastModified ?? new Date() })
      }
    }

    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (continuationToken)

  return objects
}

// Перебирает таблицу порциями по id-курсору, чтобы не держать в памяти все
// записи сразу.
async function* readInBatches<T extends { id: string }>(
  fetchPage: (cursor: string | undefined) => Promise<T[]>
): AsyncGenerator<T> {
  let cursor: string | undefined

  for (;;) {
    const page = await fetchPage(cursor)

    if (!page.length) return

    yield* page

    cursor = page[page.length - 1].id
  }
}

const collectDatabaseUrls = async (prisma: PrismaClient): Promise<string[]> => {
  const urls: string[] = []

  for await (const user of readInBatches(cursor =>
    prisma.user.findMany({
      select: { id: true, picture: true, presentationUrl: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor && { cursor: { id: cursor }, skip: 1 })
    })
  )) {
    urls.push(user.picture ?? '', user.presentationUrl ?? '')
  }

  for await (const ad of readInBatches(cursor =>
    prisma.ad.findMany({
      select: { id: true, images: true, feedSourceImages: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor && { cursor: { id: cursor }, skip: 1 })
    })
  )) {
    urls.push(...ad.images)

    // feedSourceImages — карта «ссылка дилера -> наша ссылка»; нужны значения.
    if (ad.feedSourceImages && typeof ad.feedSourceImages === 'object' && !Array.isArray(ad.feedSourceImages)) {
      urls.push(...Object.values(ad.feedSourceImages).filter((value): value is string => typeof value === 'string'))
    }
  }

  for await (const message of readInBatches(cursor =>
    prisma.message.findMany({
      select: { id: true, attachments: true },
      where: { attachments: { isEmpty: false } },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor && { cursor: { id: cursor }, skip: 1 })
    })
  )) {
    urls.push(...message.attachments)
  }

  return urls
}

const deleteObjects = async (s3: S3Client, bucket: string, keys: string[]) => {
  let deleted = 0

  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE)
    const result = await s3.send(
      new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: batch.map(Key => ({ Key })), Quiet: true } })
    )

    deleted += batch.length - (result.Errors?.length ?? 0)

    for (const error of result.Errors ?? []) {
      console.error(`  не удалось удалить ${error.Key}: ${error.Message}`)
    }

    console.log(`  обработано ${Math.min(i + BATCH_SIZE, keys.length)}/${keys.length}`)
  }

  return deleted
}

async function run() {
  const options = parseOptions(process.argv.slice(2))

  const bucket = requireEnv('S3_BUCKET_NAME')
  const urlContext: S3UrlContext = { publicUrl: requireEnv('S3_PUBLIC_URL'), bucketName: bucket }

  const s3 = new S3Client({
    endpoint: requireEnv('S3_ENDPOINT'),
    region: process.env.S3_REGION || 'ru-1',
    credentials: { accessKeyId: requireEnv('S3_ACCESS_KEY'), secretAccessKey: requireEnv('S3_SECRET_KEY') },
    forcePathStyle: true
  })

  const pool = new Pool({ connectionString: requireEnv('POSTGRES_URI') })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    // Порядок важен: сначала список объектов, потом ссылки из БД. Файл,
    // загруженный между этими шагами, в список не попадёт, а загруженный до
    // него — к моменту чтения БД уже имеет сохранённую ссылку.
    console.log('Читаю список объектов в бакете…')
    const objects = await listAllObjects(s3, bucket)

    console.log('Читаю ссылки на файлы из БД…')
    const referencedKeys = collectReferencedKeys(await collectDatabaseUrls(prisma), urlContext)

    const olderThan = new Date(Date.now() - options.graceHours * 60 * 60 * 1000)
    const orphans = findOrphanedObjects(objects, referencedKeys, olderThan)
    const missing = findMissingKeys(referencedKeys, objects)

    const byFolder = new Map<string, S3ObjectInfo[]>()

    for (const orphan of orphans) {
      const folder = orphan.key.split('/')[0]

      byFolder.set(folder, [...(byFolder.get(folder) ?? []), orphan])
    }

    console.log('\n=== Сводка ===')
    console.log(`Объектов в бакете:            ${objects.length} (${formatSize(sumSize(objects))})`)
    console.log(`Ссылок на файлы в БД:         ${referencedKeys.size}`)
    console.log(`Осиротевших файлов:           ${orphans.length} (${formatSize(sumSize(orphans))})`)

    for (const [folder, items] of byFolder) {
      console.log(`  ${folder}/: ${items.length} (${formatSize(sumSize(items))})`)
    }

    console.log(`Ссылок в БД без файла в S3:   ${missing.length}`)

    const shown = options.list ? orphans : orphans.slice(0, PREVIEW_LIMIT)

    if (shown.length) {
      const note = options.list ? '' : ` (первые ${shown.length}; полный список — в отчёте или с --list)`

      console.log(`\nОсиротевшие файлы${note}:`)

      for (const orphan of shown) {
        console.log(`  ${orphan.key}  ${formatSize(orphan.size)}  ${orphan.lastModified.toISOString()}`)
      }
    }

    writeFileSync(
      options.reportPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          graceHours: options.graceHours,
          totals: {
            objects: objects.length,
            referenced: referencedKeys.size,
            orphans: orphans.length,
            missing: missing.length
          },
          orphans: orphans.map(o => ({ key: o.key, size: o.size, lastModified: o.lastModified.toISOString() })),
          missingInBucket: missing
        },
        null,
        2
      )
    )
    console.log(`\nПолный отчёт записан: ${options.reportPath}`)

    if (!options.deleteOrphans) {
      console.log('Режим просмотра: ничего не удалено. Для удаления запустите с --delete.')

      return
    }

    if (!orphans.length) {
      console.log('Удалять нечего.')

      return
    }

    // Предохранители: пустая выборка ссылок или слишком большая доля «сирот»
    // почти всегда означают, что скрипт смотрит не в ту базу/бакет.
    if (!referencedKeys.size) {
      throw new Error('В БД не найдено ни одной ссылки на файлы — удаление отменено (проверьте POSTGRES_URI).')
    }

    if (orphans.length / objects.length > MAX_ORPHAN_SHARE && !options.force) {
      throw new Error(
        `Осиротевшими оказались ${orphans.length} из ${objects.length} объектов (больше ${MAX_ORPHAN_SHARE * 100}%) — удаление отменено. Проверьте отчёт; если всё верно, добавьте --force.`
      )
    }

    console.log(`\nУдаляю ${orphans.length} файлов…`)
    const deleted = await deleteObjects(
      s3,
      bucket,
      orphans.map(o => o.key)
    )
    console.log(`Удалено: ${deleted} из ${orphans.length}`)
  } finally {
    await prisma.$disconnect()
    s3.destroy()
  }
}

run().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
