// Точка на карте для объявлений, сохранённых без координат (0, 0): сайт
// отправлял такое, когда у выбранной подсказки адреса не было координат (см.
// AdsService.resolvePoint — новые объявления теперь получают точку на сервере).
// Скрипт нужен один раз, чтобы исправить уже опубликованные: у них поиск «рядом»
// и сортировка по расстоянию считали точкой Гвинейский залив.
//
// Черновики не трогаем: точка определяется при отправке на модерацию. Безопасен
// для повторного запуска — берёт только объявления, у которых точки всё ещё нет.
// Адрес, который геокодер не нашёл, остаётся как есть и выводится в конце:
// владельцу объявления достаточно один раз сохранить форму, выбрав адрес из
// подсказок.
//
// Запуск на сервере (та же схема, что у остальных scripts/*.ts, см. DEPLOY.md):
//   docker compose -f docker-compose.prod.yml --env-file .env exec server \
//     npm run ads:backfill-coordinates -- --dry-run
// Без --dry-run найденные точки записываются в базу. Один платный запрос к
// Яндекс-геокодеру на объявление.
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

import { AdStatus, PrismaClient } from '../src/generated/prisma/client'
import { GeocodeService } from '../src/ads/geocode.service'
import type { ConfigService } from '@nestjs/config'
import type { RedisService } from '../src/redis/redis.service'

const requireEnv = (name: string) => {
  const value = process.env[name]

  if (!value) throw new Error(`Не задана переменная окружения ${name}`)

  return value
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run')

  const pool = new Pool({ connectionString: requireEnv('POSTGRES_URI') })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  // Геокодеру нужны только ключ и кэш; Redis для разового прогона не поднимаем.
  const geocoder = new GeocodeService(
    { get: (key: string) => process.env[key] } as ConfigService,
    { get: async () => null, set: async () => undefined } as unknown as RedisService
  )

  try {
    const ads = await prisma.ad.findMany({
      where: { lat: 0, lng: 0, status: { not: AdStatus.DRAFT }, address: { not: '' } },
      select: { id: true, title: true, address: true, status: true },
      orderBy: { createdAt: 'asc' }
    })

    console.log(`Объявлений без точки: ${ads.length}${isDryRun ? ' (пробный прогон, в базу ничего не пишется)' : ''}`)

    const notFound: typeof ads = []

    for (const ad of ads) {
      const point = await geocoder.getCoordsFromAddress(ad.address)

      if (!point) {
        notFound.push(ad)
        console.log(`✗ ${ad.id} «${ad.title}» — адрес не найден: ${ad.address}`)
        continue
      }

      if (!isDryRun) await prisma.ad.update({ where: { id: ad.id }, data: point })

      console.log(`✓ ${ad.id} «${ad.title}» [${ad.status}] ${ad.address} → ${point.lat}, ${point.lng}`)
    }

    console.log(`Готово: определено ${ads.length - notFound.length}, не найдено ${notFound.length}`)
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

run().catch(error => {
  console.error(error)
  process.exitCode = 1
})
