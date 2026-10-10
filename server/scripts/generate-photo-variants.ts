// Уменьшенные копии для фото объявлений, загруженных до их появления (см.
// src/file/utils/photo-variants.util.ts). Новые фото получают копии сразу
// при загрузке (FileService.uploadAdPhoto) — скрипт нужен один раз, после
// деплоя, чтобы старые объявления в приложении тоже грузились быстро.
//
// Безопасен для повторного запуска: фото, у которого копии уже есть,
// пропускается (проверка — HEAD самой большой копии, без скачивания).
// Оригиналы не меняются.
//
// Запуск на сервере (та же схема, что у остальных scripts/*.ts, см.
// DEPLOY.md):
//   docker compose -f docker-compose.prod.yml --env-file .env exec server \
//     npm run images:generate-variants
//
// Параметры (после --):
//   --concurrency=N  сколько фото обрабатывать одновременно (по умолчанию 3).
//                    sharp и так ограничен двумя задачами на процесс, большее
//                    число только ускоряет обмен с S3.
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

import { FileService } from '../src/file/file.service'
import { PrismaClient } from '../src/generated/prisma/client'

const DEFAULT_CONCURRENCY = 3
const BATCH_SIZE = 500

const requireEnv = (name: string) => {
  const value = process.env[name]

  if (!value) throw new Error(`Не задана переменная окружения ${name}`)

  return value
}

const parseConcurrency = (args: string[]) => {
  const raw = args.find(arg => arg.startsWith('--concurrency='))?.slice('--concurrency='.length)
  const value = Number(raw ?? DEFAULT_CONCURRENCY)

  if (!Number.isInteger(value) || value < 1 || value > 16) {
    throw new Error('--concurrency должен быть целым числом от 1 до 16')
  }

  return value
}

// FileService читает настройки через ConfigService; вне Nest хватает
// объекта с теми же двумя методами поверх переменных окружения.
const envConfig = {
  get: (name: string) => process.env[name],
  getOrThrow: (name: string) => requireEnv(name)
}

async function* readAdImages(prisma: PrismaClient): AsyncGenerator<string> {
  let cursor: string | undefined

  for (;;) {
    const page = await prisma.ad.findMany({
      select: { id: true, images: true },
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor && { cursor: { id: cursor }, skip: 1 })
    })

    if (!page.length) return

    for (const ad of page) yield* ad.images

    cursor = page[page.length - 1].id
  }
}

async function run() {
  const concurrency = parseConcurrency(process.argv.slice(2))
  const fileService = new FileService(envConfig as never)
  const pool = new Pool({ connectionString: requireEnv('POSTGRES_URI') })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
  const stats = { created: 0, exists: 0, skipped: 0, failed: 0 }
  const failures: string[] = []

  const processOne = async (url: string) => {
    try {
      const result = await fileService.ensurePhotoVariants(url)

      if (result === 'created') stats.created += 1
      else if (result === 'exists') stats.exists += 1
      else stats.skipped += 1
    } catch (error) {
      stats.failed += 1
      failures.push(`${url}: ${error instanceof Error ? error.message : String(error)}`)
    }

    const done = stats.created + stats.exists + stats.skipped + stats.failed
    if (done % 100 === 0) {
      console.log(`Обработано ${done}: сделано ${stats.created}, уже были ${stats.exists}, ошибок ${stats.failed}`)
    }
  }

  try {
    // Пул из N «рабочих», которые берут фото из общего потока по одному.
    const images = readAdImages(prisma)
    const worker = async () => {
      for (;;) {
        const next = await images.next()
        if (next.done) return
        await processOne(next.value)
      }
    }

    await Promise.all(Array.from({ length: concurrency }, worker))
  } finally {
    await prisma.$disconnect()
  }

  console.log('\nГотово.')
  console.log(`  Сделаны копии:     ${stats.created}`)
  console.log(`  Копии уже были:    ${stats.exists}`)
  console.log(`  Не фото из S3:     ${stats.skipped}`)
  console.log(`  Ошибки:            ${stats.failed}`)

  if (failures.length) {
    console.log('\nНе удалось обработать (повторный запуск доделает их):')
    failures.forEach(line => console.log(`  ${line}`))
    process.exitCode = 1
  }
}

run().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
