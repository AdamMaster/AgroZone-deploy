import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '@/prisma/prisma.service'
import { CategoryFeature } from '@/generated/prisma/client'
import { EmbeddingsService } from '@/libs/embeddings/embeddings.service'
import { computeTermScore } from './utils/semantic-search.util'

export interface CategorySearchResult {
  id: string
  name: string
  slug: string
  parentName: string | null
  // Какой именно термин категории совпал с запросом лучше всего — полезно
  // и для отладки ("а, вот почему туи нашли саженцы — совпало по термину
  // 'туя западная'"), и потом можно показать в UI как подсказку.
  matchedTerm: string
  score: number
}

// Плоская, уже готовая к сравнению запись термина — то, что реально лежит
// в термин-кэше (см. CategoriesService.termCache). Не тот же тип, что
// возвращает Prisma (там term.category.name и т.п. вложенно) — тут всё
// заранее разложено по плоским полям, чтобы в горячем пути поиска
// (searchBySemantic) не тратить время на .category.name на каждой из
// тысяч записей при каждом запросе.
interface CachedCategoryTerm {
  term: string
  embedding: number[]
  categoryId: string
  categoryName: string
  categorySlug: string
  parentName: string | null
}

export interface CategoryWithChildren {
  id: string
  name: string
  slug: string
  code: string
  iconId: string | null
  parentId: string | null
  level: number
  sortOrder: number
  path: string[]
  fullPath: string
  priceUnits: string[]
  // description сюда намеренно НЕ включён — см. подробный комментарий у
  // findAll() и findMetaByFullPath() ниже. Раньше поле было здесь и
  // раздувало ответ примерно на ~1МБ несжатого RSC-payload на КАЖДОЙ
  // странице сайта (главная, каталог, объявления — всё под
  // (main)/layout.tsx), хотя реально description нигде не читался из
  // полученного здесь дерева (найдено 08.09.2026 при разборе Lighthouse
  // Performance=89/100 на десктопе — "\"description\"" встречался 1277 раз
  // в HTML главной). Поле убрано из типа целиком (не сделано опциональным),
  // по тому же принципу, что и categoryFeatures в ICategory на клиенте —
  // чтобы tsc сразу показал ошибкой любое место, которое попробует читать
  // description из дерева.
  children: CategoryWithChildren[]
}

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name)

  // Кэш терминов для семантического поиска — грузится в память один раз
  // при старте сервера (см. onModuleInit) вместо того, чтобы гонять ~12
  // тысяч строк с векторами через Prisma на КАЖДЫЙ поисковый запрос. Так
  // изначально и было сделано — и на практике же и упёрлось: у пользователя
  // прямой запрос всех терминов на каждый /search-suggest стабильно валился
  // в ETIMEDOUT (см. обсуждение с пользователем — реальный лог ошибки).
  // Минус подхода: после precompute-category-embeddings.ts (пересчёт
  // терминов) кэш работающего сервера сам не обновится — нужно перезапустить
  // dev-сервер, чтобы onModuleInit перечитал таблицу заново. Это тот же
  // компромисс, что и с прогревом модели в EmbeddingsService.onModuleInit.
  private termCache: CachedCategoryTerm[] = []

  // Вес лексического бонуса и минимальный итоговый score, ниже которого
  // подсказку не показываем (см. searchBySemantic/computeTermScore ниже) —
  // читаются из env с дефолтами, а НЕ захардкожены константами, специально
  // ради смены модели эмбеддингов: у разных моделей разный "естественный"
  // диапазон косинусных близостей (см. смену Xenova/multilingual-e5-base ->
  // deepvk/USER2-base — обсуждение с пользователем), и текущие дефолты
  // 0.85 / 0.06 калибровались ИМЕННО под e5-base. Если бы это были
  // константы в коде, пересчитать под новую модель можно было бы только
  // новым деплоем — а так это правится одной переменной окружения и
  // рестартом процесса, без редеploя, пока идёт калибровка на реальных
  // запросах (см. scripts/test-search-quality.ts — печатает score по
  // контрольным запросам, чтобы подобрать правильные значения ПЕРЕД тем,
  // как менять их в проде).
  private readonly minScore: number
  private readonly lexicalBoostWeight: number

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingsService: EmbeddingsService,
    private readonly configService: ConfigService
  ) {
    this.minScore = Number(this.configService.get<string>('CATEGORY_SEARCH_MIN_SCORE') ?? '0.85')
    this.lexicalBoostWeight = Number(this.configService.get<string>('CATEGORY_SEARCH_LEXICAL_BOOST_WEIGHT') ?? '0.06')
  }

  async onModuleInit() {
    await this.reloadTermCache()
  }

  async reloadTermCache(): Promise<void> {
    const terms = await this.prisma.categoryTerm.findMany({
      // Только листовые категории — см. searchBySemantic ниже, почему.
      where: { category: { children: { none: {} } } },
      select: {
        term: true,
        embedding: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            parent: { select: { name: true } }
          }
        }
      }
    })

    this.termCache = terms.map(item => ({
      term: item.term,
      embedding: item.embedding,
      categoryId: item.category.id,
      categoryName: item.category.name,
      categorySlug: item.category.slug,
      parentName: item.category.parent?.name ?? null
    }))

    this.logger.log(`Кэш терминов категорий для семантического поиска загружен: ${this.termCache.length} терминов`)
  }

  // Массовое дерево категорий — отдаётся на каждую навигацию по каталогу
  // (клиент грузит его целиком, чтобы построить сайдбар/breadcrumbs/кэш
  // slug->id). Раньше сюда же подмешивались categoryFeatures каждой из
  // 610 категорий (4271 запись суммарно, с полными label/description/
  // options/units) — это раздувало ответ примерно до ~2МБ, хотя реальные
  // определения атрибутов нужны почти всегда только для ОДНОЙ конкретной
  // (обычно листовой) категории за раз: сайдбар фильтра, форма подачи
  // объявления, карточка объявления, модерация. Поэтому categoryFeatures
  // здесь больше не отдаём — за ними теперь отдельный метод getFeatures()
  // и эндпоинт GET /categories/:id/features, который дергается только
  // когда конкретная категория уже выбрана.
  // priceUnits в дереве ОСТАЁТСЯ: клиентская агрегация эффективных единиц
  // измерения (getEffectivePriceUnits/getEffectivePriceUnitsForAll в
  // client/.../filter/utils/price-units.ts) рекурсивно обходит priceUnits
  // по всему поддереву (а на голом /catalog — по всему дереву целиком), и
  // делать под это отдельный запрос не имеет смысла: пришлось бы либо
  // грузить priceUnits для каждой категории отдельно, либо всё равно
  // тянуть их все разом, только вторым запросом вместо одного.
  async findAll(): Promise<CategoryWithChildren[]> {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      // Явный select без description — см. комментарий у
      // CategoryWithChildren выше. Без него Prisma тянула бы description
      // из БД для всех 638 категорий, даже притом, что build() ниже его всё
      // равно не мапит в ответ — лишняя работа и на БД, и в памяти Node.
      select: {
        id: true,
        name: true,
        slug: true,
        code: true,
        iconId: true,
        parentId: true,
        level: true,
        sortOrder: true,
        path: true,
        fullPath: true,
        priceUnits: true
      }
    })

    const byParent = new Map<string, typeof categories>()

    const key = (parentId: string | null) => parentId ?? 'root'

    for (const cat of categories) {
      const k = key(cat.parentId)

      if (!byParent.has(k)) {
        byParent.set(k, [])
      }

      byParent.get(k)!.push(cat)
    }

    const build = (parentId: string | null): CategoryWithChildren[] => {
      const children = byParent.get(key(parentId)) ?? []

      return children.map(cat => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        code: cat.code,
        iconId: cat.iconId,
        parentId: cat.parentId,
        level: cat.level,
        sortOrder: cat.sortOrder,
        path: cat.path,
        fullPath: cat.fullPath,
        priceUnits: cat.priceUnits,
        children: build(cat.id)
      }))
    }

    return build(null)
  }

  // Точечный lookup ОДНОЙ категории по fullPath — специально для
  // generateMetadata на странице каталога (buildCategoryMetaDescription
  // читает name+description). Раньше это поле ехало в общем дереве
  // findAll() — см. комментарий у CategoryWithChildren.children выше (там,
  // где раньше было description). Тот же принцип, что и у getFeatures()
  // ниже: полные данные одной категории — по требованию, а не оптом на
  // каждую навигацию по сайту.
  async findMetaByFullPath(fullPath: string): Promise<{ name: string; description: string | null } | null> {
    return this.prisma.category.findUnique({
      where: { fullPath },
      select: { name: true, description: true }
    })
  }

  // Определения атрибутов (features) ОДНОЙ категории — на замену прежнему
  // подходу "все categoryFeatures всех категорий внутри findAll()". Дергается
  // точечно, когда пользователь уже выбрал конкретную категорию (обычно
  // листовую — см. вызывающий код: Filter, CategoryCascader, AdForm,
  // модерация, страница объявления).
  async getFeatures(categoryId: string): Promise<CategoryFeature[]> {
    return this.prisma.categoryFeature.findMany({
      where: { categoryId },
      orderBy: [{ sortOrder: 'asc' }]
    })
  }

  async getCategoryPath(categoryId: string): Promise<string[]> {
    const path: string[] = []

    let current = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { slug: true, parentId: true }
    })

    while (current) {
      path.unshift(current.slug)

      if (!current.parentId) break

      current = await this.prisma.category.findUnique({
        where: { id: current.parentId },
        select: { slug: true, parentId: true }
      })
    }

    return path
  }

  buildSeoPath(categoryPath: string[], slug: string): string {
    return [...categoryPath, slug].join('/')
  }

  /**
   * Семантический поиск категории по свободному тексту (например "Туи" →
   * "Саженцы") — в отличие от обычного текстового поиска, находит категорию
   * и тогда, когда введённое слово не встречается ни в названии, ни в пути
   * категории. См. обсуждение с пользователем и EmbeddingsService.
   *
   * Сравниваем запрос не с одним вектором на категорию, а со ВСЕМИ её
   * терминами (название + каждый синоним из обогащённого description, см.
   * scripts/precompute-category-embeddings.ts) и берём МАКСИМУМ по каждой
   * категории. Пробовали раньше один усреднённый вектор на категорию —
   * не сработало: mean pooling по названию + списку из 15-25 синонимов
   * размывает вклад любого одного слова ("туя" в списке из 25 пород даёт
   * ~1/25 сигнала), и поиск не находил категорию, даже когда нужное слово
   * было прямо в её description. С максимумом по отдельным термин-векторам
   * достаточно, чтобы совпал хотя бы один термин.
   *
   * Векторы терминов и запроса уже L2-нормализованы (см. EmbeddingsService
   * — normalize: true), поэтому косинусное сходство сводится к обычному
   * скалярному произведению.
   *
   * Сравниваем с термин-кэшем в памяти (см. termCache/reloadTermCache
   * выше), а не с базой на каждый запрос — так и было раньше, пока не
   * выяснилось, что прямой запрос ~12 тысяч строк с векторами на каждый
   * /search-suggest стабильно упирается в ETIMEDOUT (см. обсуждение с
   * пользователем).
   *
   * Кэш уже отфильтрован до ЛИСТОВЫХ категорий (без детей, см.
   * reloadTermCache) — только их вообще можно выбрать как итоговую
   * категорию объявления (см. на клиенте CategoryCascader.handleCategorySelect
   * — категория с детьми клику не финализирует выбор, а раскрывает колонки
   * для уточнения). Если бы сюда попадала родительская категория, на
   * мобильной версии (где колонок с уточнением нет — см. обсуждение с
   * пользователем про мобилку у Авито) пользователю было бы некуда её
   * уточнить дальше.
   */
  async searchBySemantic(query: string, limit = 5): Promise<CategorySearchResult[]> {
    const q = query.trim()

    if (q.length < 2) return []

    const queryVector = await this.embeddingsService.getQueryEmbedding(q)

    const bestByCategory = new Map<string, CategorySearchResult>()

    for (const item of this.termCache) {
      // Чистая косинусная близость эмбеддингов на коротких запросах (2-4
      // буквы) может быть шумной (орфографически похожие, но не связанные
      // по смыслу слова обгоняют правильное совпадение) — поэтому поверх
      // неё добавлен лексический бонус (см. computeTermScore/
      // lexicalSimilarity в ./utils/semantic-search.util) с настраиваемым
      // весом lexicalBoostWeight, он ощутимо топит случайные
      // орфографические совпадения, не перекрывая настоящий семантический
      // сигнал на длинных запросах, где лексическая близость естественным
      // образом мала.
      const score = computeTermScore(queryVector, item.embedding, q, item.term, this.lexicalBoostWeight)
      const current = bestByCategory.get(item.categoryId)

      if (!current || score > current.score) {
        bestByCategory.set(item.categoryId, {
          id: item.categoryId,
          name: item.categoryName,
          slug: item.categorySlug,
          parentName: item.parentName,
          matchedTerm: item.term,
          score
        })
      }
    }

    // На абсолютно бессмысленный запрос (клавиатурный набор без слов)
    // косинусное сходство обычно всё равно не проваливается в ноль — у
    // компактных моделей без спец. калибровки score часто сжат в узкий
    // высокий диапазон, "нуля непохожести" может не существовать вовсе.
    // minScore отрезает по этому диапазону: ниже порога вообще не
    // показываем подсказки (пусть будет пустое состояние), чем врать
    // пользователю правдоподобным на вид, но случайным списком.
    //
    // ВАЖНО: minScore/lexicalBoostWeight читаются из env (см. constructor)
    // и подобраны под КОНКРЕТНУЮ модель эмбеддингов (см. EmbeddingsService)
    // — у каждой модели свой "естественный" диапазон косинусных близостей.
    // При смене модели старые значения не переносятся автоматически —
    // сначала прогнать scripts/test-search-quality.ts на контрольных
    // запросах и по его выводу подобрать новые.
    return [...bestByCategory.values()]
      .filter(result => result.score >= this.minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }
}
