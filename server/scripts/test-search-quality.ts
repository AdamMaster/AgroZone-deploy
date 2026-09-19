import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '../src/generated/prisma/client'
import { EmbeddingsService } from '../src/libs/embeddings/embeddings.service'
import { computeTermScore } from '../src/categories/utils/semantic-search.util'

// Калибровочный/регрессионный скрипт — прогоняет набор контрольных
// запросов через ТОЧНО ТАКОЙ ЖЕ алгоритм, что и живой
// CategoriesService.searchBySemantic (общий computeTermScore, см.
// server/src/categories/utils/semantic-search.util.ts), и печатает top-5
// категорий со score по каждому запросу — БЕЗ фильтрации по порогу, чтобы
// сразу было видно, где реально проходит "естественная" граница между
// уверенным совпадением и шумом у ТЕКУЩЕЙ модели эмбеддингов.
//
// Обязательно запускать:
//   1) после первой смены модели эмбеддингов (EmbeddingsService.MODEL_NAME) —
//      подобрать CATEGORY_SEARCH_MIN_SCORE/CATEGORY_SEARCH_LEXICAL_BOOST_WEIGHT
//      заново, старые значения калибровались под другую модель и, скорее
//      всего, не подойдут (см. комментарии в CategoriesService);
//   2) после любого npm run embeddings:precompute -- --force — как быстрая
//      регрессия "не сломался ли поиск" перед тем, как считать миграцию
//      завершённой.
//
// Считает эмбеддинги живыми (не по кэшу CategoriesService) — то есть
// нужен доступ к БД (актуальные CategoryTerm) и к сети (если модель ещё не
// скачана на этом окружении/её кэш пуст).
//
//   npx dotenv -e .env -- ts-node scripts/test-search-quality.ts
//   npx dotenv -e .env -- ts-node scripts/test-search-quality.ts --min-score=0.7 --lexical-weight=0.06
//
// --min-score / --lexical-weight — только для ЭТОГО прогона (ничего не
// пишут в БД и не трогают .env) — сравнить, как разные значения порога
// делят один и тот же список результатов на "показать"/"не показывать",
// прежде чем реально выставлять CATEGORY_SEARCH_MIN_SCORE в проде.

const pool = new Pool({ connectionString: process.env.POSTGRES_URI })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

const embeddingsService = new EmbeddingsService()

function argNumber(flag: string, fallback: number): number {
  const arg = process.argv.find(a => a.startsWith(`${flag}=`))

  return arg ? Number(arg.slice(flag.length + 1)) : fallback
}

const minScore = argNumber('--min-score', 0.85)
const lexicalBoostWeight = argNumber('--lexical-weight', 0.06)

// Контрольные запросы — реальные случаи, на которых раньше уже находили
// проблемы (см. историю комментариев в CategoriesService/EmbeddingsService):
//   - "туи" / "ель голубая" — короткие запросы обиходными/неполными
//     названиями, должны найти категорию саженцев/хвойных пород, даже если
//     слова нет буквально в названии категории;
//   - "доставка урожая" — проверка, что услуги (см. isServiceCategory в
//     enrich-category-descriptions.ts) находятся по синонимам самого
//     действия, а не только по перечню товаров;
//   - "йцкрпйукр"/"фвафвафыв" — заведомо бессмысленный набор символов, НЕ
//     должен уверенно попадать ни в одну категорию (по нему видно, где
//     реально проходит "пол" случайного шума у текущей модели — от него и
//     нужно отталкиваться при выборе min-score).
// Список стоит пополнять реальными случаями, которые найдёте вручную —
// это же регрессионный набор на будущее (в том числе на следующую смену
// модели).
const TEST_QUERIES = ['туи', 'ель голубая', 'доставка урожая', 'трактор', 'йцкрпйукрен', 'фвафвафыв']

interface CachedTerm {
  term: string
  embedding: number[]
  categoryId: string
  categoryName: string
  categorySlug: string
  parentName: string | null
}

async function loadTermCache(): Promise<CachedTerm[]> {
  const terms = await prisma.categoryTerm.findMany({
    where: { category: { children: { none: {} } } },
    select: {
      term: true,
      embedding: true,
      category: {
        select: { id: true, name: true, slug: true, parent: { select: { name: true } } }
      }
    }
  })

  return terms.map(item => ({
    term: item.term,
    embedding: item.embedding,
    categoryId: item.category.id,
    categoryName: item.category.name,
    categorySlug: item.category.slug,
    parentName: item.category.parent?.name ?? null
  }))
}

async function run() {
  console.log(`Параметры прогона: min-score=${minScore}, lexical-weight=${lexicalBoostWeight}\n`)

  const termCache = await loadTermCache()

  console.log(`Термин-кэш загружен: ${termCache.length} терминов\n`)

  for (const query of TEST_QUERIES) {
    const queryVector = await embeddingsService.getQueryEmbedding(query)

    const bestByCategory = new Map<
      string,
      { name: string; parentName: string | null; matchedTerm: string; score: number }
    >()

    for (const item of termCache) {
      const score = computeTermScore(queryVector, item.embedding, query, item.term, lexicalBoostWeight)
      const current = bestByCategory.get(item.categoryId)

      if (!current || score > current.score) {
        bestByCategory.set(item.categoryId, {
          name: item.categoryName,
          parentName: item.parentName,
          matchedTerm: item.term,
          score
        })
      }
    }

    const top5 = [...bestByCategory.values()].sort((a, b) => b.score - a.score).slice(0, 5)

    console.log(`Запрос: "${query}"`)

    if (top5.length === 0) {
      console.log('  (нет ни одной категории вообще — термин-кэш пуст?)')
    }

    for (const result of top5) {
      const passes = result.score >= minScore ? 'ПРОЙДЁТ порог' : 'ниже порога'
      const parent = result.parentName ? `${result.parentName} > ` : ''

      console.log(`  ${result.score.toFixed(3)} [${passes}] ${parent}${result.name} (термин: "${result.matchedTerm}")`)
    }

    console.log('')
  }

  console.log(
    'Готово. Проверьте глазами: правильная категория должна быть №1 (или уверенно в топ-5) и ПРОХОДИТЬ порог у ' +
      'осмысленных запросов, а у бессмысленных ("йцкрпйукрен"/"фвафвафыв") лучший результат должен НЕ проходить ' +
      'порог. Если это не так — подберите другие --min-score/--lexical-weight, перепроверьте этим же скриптом, и ' +
      'только потом выставьте CATEGORY_SEARCH_MIN_SCORE/CATEGORY_SEARCH_LEXICAL_BOOST_WEIGHT в .env прода.'
  )
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
