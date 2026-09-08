import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import type { ConfigService } from '@nestjs/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { EmbeddingsService } from '../src/libs/embeddings/embeddings.service'
import { GigaChatService } from '../src/libs/gigachat/gigachat.service'

// Разовый скрипт: просит GigaChat сгенерировать для каждой категории
// список обиходных названий/сортов/видов товаров, которые в неё логично
// отнести — и кладёт это в Category.description, через запятую (термин1,
// термин2, ...). После этого нужно ОБЯЗАТЕЛЬНО прогнать
//   npm run embeddings:precompute -- --force
// (именно с --force) — precompute-category-embeddings.ts бьёт description
// на отдельные термины и считает эмбеддинг КАЖДОМУ термину отдельно (не
// одному вектору на всё description разом — так пробовали, не сработало,
// см. комментарий в schema.prisma у CategoryTerm), а без --force он
// пропустит категории, у которых термины уже когда-то были посчитаны.
//
// Смысл в том, чтобы НЕ писать эти синонимы руками для каждой категории
// (агропромышленная лексика огромная — виды растений, породы, сорта грибов
// и т.д., см. обсуждение с пользователем) — вместо этого GigaChat один раз
// генерирует их сам по названию категории.
//
//   npx dotenv -e .env -- ts-node scripts/enrich-category-descriptions.ts
//   npx dotenv -e .env -- ts-node scripts/enrich-category-descriptions.ts --force
//   npx dotenv -e .env -- ts-node scripts/enrich-category-descriptions.ts --only="Горчица,Комбайны"
//
// --only — точечно перегенерировать конкретные категории по имени (через
// запятую), НЕЗАВИСИМО от того, есть у них уже description или нет —
// удобно, чтобы проверить эффект правки промпта/фильтра на конкретном
// известном случае (см. пример с "Горчицей" в комментарии ниже), не
// перегоняя через GigaChat всё дерево целиком с --force. Совпадение по
// имени, а не по id — специально: одноимённые категории в разных ветках
// (как раз "Горчица" в Технических и в Масличных культурах) обе попадут
// под перегенерацию, что и нужно для сравнения до/после.
//
// Через Nest DI не идём (как и остальные скрипты в scripts/) — GigaChatService
// и ConfigService прекрасно работают и как обычные классы вне Nest-контекста.
//
// Два улучшения (08.09.2026, по запросу владельца — "сделать обогащение
// умнее"):
//
// 1. В промпт теперь идёт не только имя ближайшего родителя, а вся цепочка
//    предков до корня ("Полевые культуры > Технические культуры"), а не
//    только "Технические культуры" — без этого GigaChat видел лишь один
//    уровень контекста и не отличал, например, "Горчицу" в "Технических
//    культурах" от "Горчицы" в "Масличных культурах" настолько же уверенно.
//
// 2. Каждый сгенерированный термин перепроверяется собственным эмбеддингом
//    (той же моделью, что потом реально ищет пользователь, см.
//    EmbeddingsService) против названия категории — термины с низким
//    сходством отбрасываются ДО записи в description, чтобы явные
//    галлюцинации GigaChat не попадали в поисковый индекс. Порог
//    сознательно НЕ такой строгий, как MIN_SCORE=0.85 в
//    CategoriesService.searchBySemantic (тот калибровался для запроса
//    пользователя к готовым терминам, с лексическим бонусом сверху) — у
//    этой модели диапазон осмысленных косинусных близостей вообще узкий и
//    сжатый (см. комментарий у MIN_SCORE: даже случайный набор символов
//    даёт ~0.838), поэтому дропаем только явные выбросы, а не пытаемся
//    угадать идеальный порог с одной попытки. Список отброшенного всегда
//    печатается в консоль — это и есть реальная проверка, а не слепое
//    доверие числу.

const pool = new Pool({ connectionString: process.env.POSTGRES_URI })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// GigaChatService у нас просит только configService.getOrThrow(...) —
// поднимать ради одного этого метода настоящий @nestjs/config ConfigService
// вне Nest-контекста смысла нет (его конструктор не для этого), поэтому
// передаём минимальную самодельную реализацию поверх process.env.
class EnvConfigService {
  getOrThrow<T = string>(key: string): T {
    const value = process.env[key]

    if (value === undefined || value === '') {
      throw new Error(`Переменная окружения ${key} не задана`)
    }

    return value as unknown as T
  }
}

const gigaChatService = new GigaChatService(new EnvConfigService() as unknown as ConfigService)
const embeddingsService = new EmbeddingsService()

// См. комментарий выше про MIN_SCORE=0.85 в CategoriesService — тот порог
// не переиспользуем один в один (разные сценарии сравнения), но держимся
// того же порядка величины: у модели multilingual-e5-base осмысленный
// диапазон косинусных близостей и так сжат к верху, ниже 0.83 у РЕАЛЬНОГО
// (не случайного) сгенерированного термина оказываются практически только
// явные промахи GigaChat.
const MIN_TERM_SIMILARITY = 0.83

// --force — перегенерировать описание даже у категорий, у которых оно уже
// есть (например если хотим обновить формулировки или сменили промпт).
// По умолчанию трогаем только категории с пустым description, чтобы
// повторный запуск (после добавления новых категорий) не жёг токены
// впустую на те, что уже обогащены.
const force = process.argv.includes('--force')

const onlyArg = process.argv.find(arg => arg.startsWith('--only='))
const onlyNames = onlyArg
  ? onlyArg
      .slice('--only='.length)
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)
  : null

// Между запросами — небольшая пауза, чтобы не долбить GigaChat пачкой
// параллельных запросов и не словить лимит по RPS у бесплатного тарифа.
const DELAY_BETWEEN_REQUESTS_MS = 300

function buildPrompt(categoryName: string, ancestorNames: string[]): string {
  const parentContext = ancestorNames.length > 0 ? ` (входит в раздел "${ancestorNames.join(' > ')}")` : ''

  return (
    `Ты помощник интернет-магазина сельскохозяйственных товаров "AgroZone". ` +
    `Есть категория объявлений: "${categoryName}"${parentContext}. ` +
    `Перечисли через запятую 15-25 конкретных примеров товаров, культур, пород, сортов, видов ` +
    `и их обиходных/разговорных названий, которые логично отнести именно к этой категории, а не к соседним. ` +
    `Не пиши вступление, пояснения, нумерацию или заключение — верни только сам список через запятую.`
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Термины через запятую от GigaChat — как их потом же режет
// precompute-category-embeddings.ts (splitTerms там). Проверяем описание
// уже В ЭТОМ виде, чтобы фильтровать именно то, что реально попадёт в
// поисковый индекс термин за термином, а не сырую строку целиком.
function splitTerms(description: string): string[] {
  return description
    .split(',')
    .map(term => term.trim())
    .filter(term => term.length >= 2)
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0

  for (let i = 0; i < a.length && i < b.length; i++) {
    sum += a[i] * b[i]
  }

  return sum
}

// Цепочка имён предков от корня до непосредственного родителя (сам
// categoryId в неё не входит). Строим один раз по всем категориям разом —
// категорий в проекте десятки-сотни, отдельный запрос на каждую того не
// стоит.
function getAncestorNames(categoryId: string, byId: Map<string, { name: string; parentId: string | null }>): string[] {
  const names: string[] = []
  let parentId = byId.get(categoryId)?.parentId ?? null

  while (parentId) {
    const parent = byId.get(parentId)

    if (!parent) break

    names.unshift(parent.name)
    parentId = parent.parentId
  }

  return names
}

// Отбрасывает термины, семантически далёкие от названия категории —
// вероятные галлюцинации GigaChat. Пустой результат (весь список
// отфильтровался) — подозрительный случай сам по себе, скорее промах
// порога, чем реальность: лучше сохранить термины как есть и дать
// возможность проверить глазами, чем остаться совсем без description.
async function filterHallucinatedTerms(categoryName: string, terms: string[]): Promise<string[]> {
  if (terms.length === 0) return terms

  const [nameVector, ...termVectors] = await embeddingsService.getCategoryEmbeddings([categoryName, ...terms])

  const kept: string[] = []
  const dropped: { term: string; score: number }[] = []

  terms.forEach((term, index) => {
    const score = dotProduct(nameVector, termVectors[index])

    if (score >= MIN_TERM_SIMILARITY) {
      kept.push(term)
    } else {
      dropped.push({ term, score })
    }
  })

  if (dropped.length > 0) {
    console.log(
      `   отфильтровано как подозрительно непохожее на "${categoryName}": ${dropped
        .map(d => `"${d.term}" (${d.score.toFixed(3)})`)
        .join(', ')}`
    )
  }

  if (kept.length === 0) {
    console.log(`   ⚠ фильтр отбросил ВСЕ термины у "${categoryName}" — похоже на промах порога, оставляю как есть`)

    return terms
  }

  return kept
}

async function run() {
  // Полное дерево (id/name/parentId) — для цепочки предков в промпте
  // (getAncestorNames). Категорий немного, лишний столбец description сюда
  // не тянем — не нужен.
  const allCategories = await prisma.category.findMany({ select: { id: true, name: true, parentId: true } })
  const byId = new Map(allCategories.map(c => [c.id, { name: c.name, parentId: c.parentId }]))

  const categories = await prisma.category.findMany({
    where: onlyNames ? { name: { in: onlyNames } } : force ? {} : { OR: [{ description: null }, { description: '' }] },
    select: { id: true, name: true, description: true }
  })

  if (categories.length === 0) {
    console.log(
      onlyNames
        ? `Не нашёл категорий с именами: ${onlyNames.join(', ')} — проверьте написание.`
        : 'Нечего обогащать — у всех категорий уже есть описание (используйте --force для перегенерации).'
    )

    return
  }

  console.log(`Обогащаю описания для ${categories.length} категорий через GigaChat...`)

  let done = 0

  for (const category of categories) {
    const ancestorNames = getAncestorNames(category.id, byId)
    const prompt = buildPrompt(category.name, ancestorNames)

    try {
      const generated = await gigaChatService.generateText(prompt)
      const terms = await filterHallucinatedTerms(category.name, splitTerms(generated))
      const finalDescription = terms.join(', ')

      await prisma.category.update({
        where: { id: category.id },
        data: { description: finalDescription }
      })

      done++

      console.log(`${done} / ${categories.length} — "${category.name}": ${finalDescription}`)
    } catch (error) {
      console.error(`Не удалось обогатить "${category.name}":`, error)
    }

    await sleep(DELAY_BETWEEN_REQUESTS_MS)
  }

  console.log('ГОТОВО. Теперь запустите: npm run embeddings:precompute -- --force')
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
