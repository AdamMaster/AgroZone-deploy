import pathlib

def replace_once(path, old, new, label):
    p = pathlib.Path(path)
    s = p.read_text(encoding="utf-8")
    n = s.count(old)
    assert n == 1, f"{label} ({path}): expected exactly 1 occurrence, got {n}"
    p.write_text(s.replace(old, new), encoding="utf-8")

PATH = "server/scripts/enrich-category-descriptions.ts"

# ── 1. imports + intro comment ──────────────────────────────────────────
replace_once(
    PATH,
    """import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import type { ConfigService } from '@nestjs/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { GigaChatService } from '../src/libs/gigachat/gigachat.service'
""",
    """import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import type { ConfigService } from '@nestjs/config'
import { PrismaClient } from '../src/generated/prisma/client'
import { EmbeddingsService } from '../src/libs/embeddings/embeddings.service'
import { GigaChatService } from '../src/libs/gigachat/gigachat.service'
""",
    "imports",
)

replace_once(
    PATH,
    """// Смысл в том, чтобы НЕ писать эти синонимы руками для каждой категории
// (агропромышленная лексика огромная — виды растений, породы, сорта грибов
// и т.д., см. обсуждение с пользователем) — вместо этого GigaChat один раз
// генерирует их сам по названию категории.
//
//   npx dotenv -e .env -- ts-node scripts/enrich-category-descriptions.ts
//   npx dotenv -e .env -- ts-node scripts/enrich-category-descriptions.ts --force
//
// Через Nest DI не идём (как и остальные скрипты в scripts/) — GigaChatService
// и ConfigService прекрасно работают и как обычные классы вне Nest-контекста.
""",
    """// Смысл в том, чтобы НЕ писать эти синонимы руками для каждой категории
// (агропромышленная лексика огромная — виды растений, породы, сорта грибов
// и т.д., см. обсуждение с пользователем) — вместо этого GigaChat один раз
// генерирует их сам по названию категории.
//
//   npx dotenv -e .env -- ts-node scripts/enrich-category-descriptions.ts
//   npx dotenv -e .env -- ts-node scripts/enrich-category-descriptions.ts --force
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
""",
    "intro comment",
)

# ── 2. constants + helpers (dotProduct, ancestor map, filter fn) ────────
replace_once(
    PATH,
    """const gigaChatService = new GigaChatService(new EnvConfigService() as unknown as ConfigService)
""",
    """const gigaChatService = new GigaChatService(new EnvConfigService() as unknown as ConfigService)
const embeddingsService = new EmbeddingsService()

// См. комментарий выше про MIN_SCORE=0.85 в CategoriesService — тот порог
// не переиспользуем один в один (разные сценарии сравнения), но держимся
// того же порядка величины: у модели multilingual-e5-base осмысленный
// диапазон косинусных близостей и так сжат к верху, ниже 0.83 у РЕАЛЬНОГО
// (не случайного) сгенерированного термина оказываются практически только
// явные промахи GigaChat.
const MIN_TERM_SIMILARITY = 0.83
""",
    "embeddingsService + MIN_TERM_SIMILARITY",
)

replace_once(
    PATH,
    """function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
""",
    """function sleep(ms: number): Promise<void> {
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
function getAncestorNames(
  categoryId: string,
  byId: Map<string, { name: string; parentId: string | null }>
): string[] {
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
""",
    "helper functions",
)

# ── 3. buildPrompt signature: parentName -> ancestorNames[] ─────────────
replace_once(
    PATH,
    """function buildPrompt(categoryName: string, parentName: string | null): string {
  const parentContext = parentName ? ` (входит в раздел "${parentName}")` : ''
""",
    """function buildPrompt(categoryName: string, ancestorNames: string[]): string {
  const parentContext = ancestorNames.length > 0 ? ` (входит в раздел "${ancestorNames.join(' > ')}")` : ''
""",
    "buildPrompt signature",
)

# ── 4. run(): fetch ancestor map, use it instead of parent.name, filter before saving ──
replace_once(
    PATH,
    """async function run() {
  const categories = await prisma.category.findMany({
    where: force ? {} : { OR: [{ description: null }, { description: '' }] },
    select: { id: true, name: true, description: true, parent: { select: { name: true } } }
  })

  if (categories.length === 0) {
    console.log('Нечего обогащать — у всех категорий уже есть описание (используйте --force для перегенерации).')

    return
  }

  console.log(`Обогащаю описания для ${categories.length} категорий через GigaChat...`)

  let done = 0

  for (const category of categories) {
    const prompt = buildPrompt(category.name, category.parent?.name ?? null)

    try {
      const generated = await gigaChatService.generateText(prompt)

      await prisma.category.update({
        where: { id: category.id },
        data: { description: generated }
      })

      done++

      console.log(`${done} / ${categories.length} — "${category.name}": ${generated}`)
    } catch (error) {
      console.error(`Не удалось обогатить "${category.name}":`, error)
    }

    await sleep(DELAY_BETWEEN_REQUESTS_MS)
  }

  console.log('ГОТОВО. Теперь запустите: npm run embeddings:precompute -- --force')
}""",
    """async function run() {
  // Полное дерево (id/name/parentId) — для цепочки предков в промпте
  // (getAncestorNames). Категорий немного, лишний столбец description сюда
  // не тянем — не нужен.
  const allCategories = await prisma.category.findMany({ select: { id: true, name: true, parentId: true } })
  const byId = new Map(allCategories.map(c => [c.id, { name: c.name, parentId: c.parentId }]))

  const categories = await prisma.category.findMany({
    where: force ? {} : { OR: [{ description: null }, { description: '' }] },
    select: { id: true, name: true, description: true }
  })

  if (categories.length === 0) {
    console.log('Нечего обогащать — у всех категорий уже есть описание (используйте --force для перегенерации).')

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
}""",
    "run() body",
)

print("OK")
