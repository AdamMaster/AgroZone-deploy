import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { SellerRatingService } from '../src/seller-reviews/seller-rating.service'
import { SELLER_REVIEW_BASE_WEIGHT } from '../src/seller-reviews/constants/seller-reviews.constants'

// Тестовые данные и замер нагрузки для рейтингов продавцов (этап 8 плана
// claude/seller-ratings-plan.md). Только для локальной или тестовой базы:
// скрипт создаёт тысячи пользователей и отзывов.
//
// Все созданные пользователи помечены доменом почты TEST_EMAIL_DOMAIN, по нему
// же их находит cleanup (отзывы удаляются каскадом). Реальных пользователей
// скрипт не трогает.
//
// Запуск из папки server (после `npm run prisma:deploy`):
//   npm run seller-ratings:load -- seed --sellers=3 --reviews=1000 --yes
//   npm run seller-ratings:load -- bench
//   npm run seller-ratings:load -- cleanup --yes
//
// --yes обязателен для seed и cleanup: перед работой скрипт печатает, к какой
// базе подключён, чтобы случайно не запустить его на проде.

const TEST_EMAIL_DOMAIN = '@seller-ratings.test'
const CHUNK = 1000
const SLOW_MS = 150

const pool = new Pool({ connectionString: process.env.POSTGRES_URI })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })
const ratingService = new SellerRatingService()

const args = process.argv.slice(2)
const command = args[0]
const flag = (name: string, fallback: number) => {
  const raw = args.find(arg => arg.startsWith(`--${name}=`))

  return raw ? Number(raw.split('=')[1]) : fallback
}
const confirmed = args.includes('--yes')

const describeDatabase = () => {
  try {
    const url = new URL(process.env.POSTGRES_URI ?? '')

    return `${url.hostname}:${url.port || '5432'}${url.pathname}`
  } catch {
    return '(POSTGRES_URI не задан или не разобран)'
  }
}

const time = async <T>(label: string, fn: () => Promise<T>) => {
  const start = performance.now()
  const result = await fn()
  const ms = performance.now() - start

  return { label, ms, result }
}

// Оценка смещена к 4–5, как в живых отзывах.
const randomRating = () => {
  const roll = Math.random()

  if (roll < 0.62) return 5
  if (roll < 0.85) return 4
  if (roll < 0.93) return 3
  if (roll < 0.97) return 2

  return 1
}

const SAMPLE_TEXTS = [
  'Всё хорошо, продавец отвечал быстро, товар как в описании.',
  'Забрал технику в тот же день, претензий нет.',
  'Долго договаривались о цене, в итоге сошлись. Товар соответствует.',
  null,
  null,
  'Рекомендую, надёжный продавец.',
  'Пришлось ждать ответа сутки, но сделка прошла нормально.'
]

async function seed() {
  const sellers = flag('sellers', 3)
  const reviewsPerSeller = flag('reviews', 1000)
  const stamp = Date.now().toString(36)
  const longAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  console.log(`Создаю ${sellers} продавцов и по ${reviewsPerSeller} отзывов у каждого...`)

  const sellerIds: string[] = []

  for (let i = 0; i < sellers; i++) {
    const seller = await prisma.user.create({
      data: {
        email: `sr-seller-${stamp}-${i}${TEST_EMAIL_DOMAIN}`,
        displayName: `Тест-продавец ${i + 1}`,
        method: 'CREDENTIALS',
        createdAt: longAgo
      },
      select: { id: true }
    })
    sellerIds.push(seller.id)
  }

  const authorIds: string[] = []

  for (let start = 0; start < reviewsPerSeller; start += CHUNK) {
    const size = Math.min(CHUNK, reviewsPerSeller - start)
    const rows = Array.from({ length: size }, (_, i) => ({
      email: `sr-author-${stamp}-${start + i}${TEST_EMAIL_DOMAIN}`,
      displayName: `Тест-автор ${start + i + 1}`,
      method: 'CREDENTIALS' as const,
      createdAt: longAgo
    }))
    const created = await prisma.user.createManyAndReturn({ data: rows, select: { id: true } })

    authorIds.push(...created.map(user => user.id))
  }

  for (const sellerId of sellerIds) {
    for (let start = 0; start < authorIds.length; start += CHUNK) {
      const reviews = authorIds.slice(start, start + CHUNK).map((authorId, i) => {
        const confirmedDeal = Math.random() < 0.3
        const contactType = confirmedDeal ? ('DEAL_CONFIRMED' as const) : ('CONTACT' as const)

        return {
          sellerId,
          authorId,
          contactType,
          rating: randomRating(),
          text: SAMPLE_TEXTS[(start + i) % SAMPLE_TEXTS.length],
          weight: SELLER_REVIEW_BASE_WEIGHT[contactType],
          // Разные даты, чтобы выдача по createdAt была похожа на живую.
          createdAt: new Date(Date.now() - (start + i) * 60 * 60 * 1000)
        }
      })

      await prisma.sellerReview.createMany({ data: reviews })
    }

    await prisma.$transaction(tx => ratingService.recalculate(tx, [sellerId]), { timeout: 60_000 })
  }

  const result = await prisma.user.findMany({
    where: { id: { in: sellerIds } },
    select: { displayName: true, ratingAverage: true, ratingCount: true }
  })

  console.table(result)
  console.log('Готово. Замер: npm run seller-ratings:load -- bench. Уборка: ... -- cleanup --yes')
}

async function bench() {
  const sellers = await prisma.user.findMany({
    where: { email: { endsWith: TEST_EMAIL_DOMAIN }, ratingCount: { gt: 0 } },
    select: { id: true, displayName: true, ratingCount: true },
    orderBy: { ratingCount: 'desc' },
    take: 3
  })

  if (sellers.length === 0) {
    console.log('Тестовых продавцов нет. Сначала: seed --yes')
    return
  }

  const rows: { продавец: string; отзывов: number; проверка: string; мс: number; статус: string }[] = []

  const record = (seller: (typeof sellers)[number], label: string, ms: number) =>
    rows.push({
      продавец: seller.displayName ?? seller.id,
      отзывов: seller.ratingCount,
      проверка: label,
      мс: Math.round(ms * 10) / 10,
      статус: ms > SLOW_MS ? 'МЕДЛЕННО' : 'ok'
    })

  for (const seller of sellers) {
    const where = { sellerId: seller.id, status: 'PUBLISHED' as const }
    const orderBy = [{ createdAt: 'desc' as const }, { id: 'desc' as const }]
    const select = {
      id: true,
      rating: true,
      text: true,
      createdAt: true,
      author: { select: { id: true, displayName: true } }
    }

    const first = await time('первая страница', () =>
      prisma.sellerReview.findMany({ where, orderBy, take: 21, select })
    )
    record(seller, 'список: первая страница (20)', first.ms)

    // Глубокая страница: курсор на 80% списка.
    const ids = await prisma.sellerReview.findMany({ where, orderBy, select: { id: true } })
    const cursorId = ids[Math.floor(ids.length * 0.8)]?.id

    if (cursorId) {
      const deep = await time('глубокая страница', () =>
        prisma.sellerReview.findMany({ where, orderBy, take: 21, cursor: { id: cursorId }, skip: 1, select })
      )
      record(seller, 'список: страница с 80% глубины', deep.ms)
    }

    const profile = await time('профиль', () =>
      prisma.user.findUnique({ where: { id: seller.id }, select: { ratingAverage: true, ratingCount: true } })
    )
    record(seller, 'профиль продавца: рейтинг', profile.ms)

    // Пересчёт идёт в транзакции при каждой правке отзыва.
    const recalc = await time('пересчёт', () =>
      prisma.$transaction(tx => ratingService.recalculate(tx, [seller.id]), { timeout: 60_000 })
    )
    record(seller, 'пересчёт рейтинга (один отзыв изменён)', recalc.ms)
  }

  console.table(rows)

  const plan = await prisma.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
    `EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM seller_reviews WHERE seller_id = '${sellers[0].id}' AND status = 'PUBLISHED' ORDER BY created_at DESC, id DESC LIMIT 21`
  )
  console.log('\nПлан запроса списка (первая страница):')
  console.log(plan.map(row => row['QUERY PLAN']).join('\n'))

  const slow = rows.filter(row => row.статус !== 'ok')

  console.log(
    slow.length === 0
      ? `\nВсе проверки быстрее ${SLOW_MS} мс.`
      : `\nМедленных проверок: ${slow.length}. Пришлите вывод — разберём.`
  )
}

async function cleanup() {
  const { count } = await prisma.user.deleteMany({ where: { email: { endsWith: TEST_EMAIL_DOMAIN } } })

  console.log(`Удалено тестовых пользователей: ${count} (их отзывы удалены каскадом).`)
}

async function run() {
  console.log(`База: ${describeDatabase()}`)

  if (command === 'bench') {
    await bench()
    return
  }

  if (command !== 'seed' && command !== 'cleanup') {
    console.error('Использование: seed [--sellers=3] [--reviews=1000] --yes | bench | cleanup --yes')
    process.exitCode = 1
    return
  }

  if (!confirmed) {
    console.error('Проверьте базу выше и добавьте --yes, если это локальная или тестовая база.')
    process.exitCode = 1
    return
  }

  await (command === 'seed' ? seed() : cleanup())
}

run()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
