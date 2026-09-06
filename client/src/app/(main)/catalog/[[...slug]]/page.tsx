import { Metadata } from 'next'
import { cache } from 'react'

import { CatalogContent } from '@/components/features/ads/components'
import { adsService } from '@/components/features/ads/services'
import { IAdsListResponse } from '@/components/features/ads/types/ad.types'
import { ICategory } from '@/components/features/categories/types'
import { buildAdsQueryParams, CATALOG_PAGE_SIZE } from '@/components/features/ads/utils/build-ads-query-params'
import { categoriesService } from '@/components/features/categories/services'
import {
  buildCategoryMap,
  buildCategoryMetaDescription,
  findCategoryIdBySlug
} from '@/components/features/categories/utils/category-utils'
import { parseCatalogFiltersFromSearchParams } from '@/components/features/filter/utils/parse-catalog-filters'
import { Container, JsonLd } from '@/components/layout'

import { buildAdsItemListJsonLd, buildBreadcrumbListJsonLd, JsonLdBreadcrumbItem } from '@/shared/utils/json-ld'
import { buildPageMetadata } from '@/shared/utils/metadata'

// Раньше здесь стоял 'force-dynamic' — CatalogContent безусловно вызывает
// useCatalogFilters() (сайдбар фильтров сразу применяет изменения —
// immediate: true по умолчанию), а внутри этого хука useSearchParams(): без
// force-dynamic статический пререндер базового /catalog падал так же, как
// раньше падал /ads/create.
//
// Теперь этот компонент сам читает проп searchParams (нужно для SSR первой
// страницы объявлений — см. ниже) — а обращение к searchParams в серверном
// компоненте само по себе, официальным путём, переводит маршрут в
// динамический рендеринг на каждый запрос ещё ДО попытки статической
// генерации, так что до useSearchParams() в клиентском потомке дело вообще
// не доходит и раньше падавшая статическая сборка здесь больше не
// пытается случиться. force-dynamic снят намеренно: именно он запрещал
// Data Cache для fetch — из-за него revalidate у adsService.findAll ниже
// не имел бы смысла (см. S1 в ROADMAP.md).
type PageParams = {
  slug?: string[]
}

// Next 15+/16 — оба пропа page-компонента асинхронные (Promise).
type SearchParams = Record<string, string | string[] | undefined>

interface Props {
  params: Promise<PageParams>
  searchParams: Promise<SearchParams>
}

function getSlugPath(slug?: string[]) {
  return slug?.length ? slug.join('/') : null
}

// Next отдаёt searchParams плоским объектом (не URLSearchParams), причём
// значение может быть массивом при повторяющемся ключе в querystring —
// наши фильтры такого не ожидают, поэтому просто берём первое значение.
function toURLSearchParams(searchParams: SearchParams): URLSearchParams {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue
    params.set(key, Array.isArray(value) ? value[0] : value)
  }

  return params
}

// Та же логика, что у видимых хлебных крошек (CatalogBreadcrumbs,
// категории/components) — для каждого префикса сегментов пути ищем
// категорию по fullPath в buildCategoryMap. Продублировано здесь, а не
// вызвано напрямую из CatalogBreadcrumbs, потому что тот компонент
// клиентский (сам читает useParams/usePathname) и строит крошки уже ПОСЛЕ
// гидратации — для BreadcrumbList в JSON-LD нужен готовый список ещё на
// сервере, в исходном HTML.
function buildCatalogBreadcrumbItems(categories: ICategory[], slugPath: string | null): JsonLdBreadcrumbItem[] {
  const items: JsonLdBreadcrumbItem[] = [{ name: 'Объявления', path: '/catalog' }]

  if (!slugPath) return items

  const categoryMap = buildCategoryMap(categories)
  const segments = slugPath.split('/')

  for (let i = 0; i < segments.length; i++) {
    const partialPath = segments.slice(0, i + 1).join('/')
    const lookup = categoryMap.get(partialPath)

    if (!lookup) break

    items.push({ name: lookup.category.name, path: `/catalog/${partialPath}` })
  }

  return items
}

// cache() дедуплицирует между generateMetadata и самим компонентом страницы
// в рамках одного рендера — тот же приём, что и в ads/[id]/page.tsx.
const getCategories = cache(() => categoriesService.findAll())

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const slugPath = getSlugPath(slug)
  // canonical/og:url всегда строится ТОЛЬКО из пути каталога, без query —
  // сюда никогда не попадают параметры фильтра/поиска (см. buildPageMetadata
  // и комментарий у BuildPageMetadataOptions.path), иначе каждая комбинация
  // фильтров была бы для поисковика отдельной "страницей"-дублем.
  const path = slugPath ? `/catalog/${slugPath}` : '/catalog'

  try {
    const categories = await getCategories()

    // Было: categories.find(c => c.slug === slugPath) — categories это
    // ДЕРЕВО (только корневые категории верхнего уровня, вложенные — в
    // .children), поэтому .find без рекурсии никогда не находил категорию
    // глубже первого уровня, а сравнение с c.slug (голый слаг) вместо
    // fullPath было бы неверным даже для рекурсивного обхода — у двух
    // разных родителей могут быть дети с одинаковым slug. buildCategoryMap
    // строит плоскую карту по fullPath (уникален по всему дереву) — им же
    // пользуются хлебные крошки (catalog-breadcrumbs.tsx).
    const currentCategory = slugPath ? buildCategoryMap(categories).get(slugPath)?.category : null

    if (!currentCategory) {
      return buildPageMetadata({
        title: 'Каталог объявлений',
        description: 'Каталог объявлений на агропромышленной площадке AgroZone: продукция, сырьё, техника и оборудование от проверенных поставщиков.',
        path
      })
    }

    return buildPageMetadata({
      // Заголовок уже содержит «AgroZone» сам по себе — title.absolute
      // (brandInTitle) не даёт общему template в app/layout.tsx приписать
      // бренд второй раз (см. комментарий у BuildPageMetadataOptions —
      // найдено ранее при закрытии другой задачи, S3 «убрать дубль бренда
      // в title», но не было исправлено там).
      title: `${currentCategory.name} — купить в каталоге AgroZone`,
      description: buildCategoryMetaDescription(currentCategory),
      path,
      brandInTitle: true
    })
  } catch {
    return buildPageMetadata({
      title: 'Каталог',
      description: 'Каталог объявлений на агропромышленной площадке AgroZone.',
      path
    })
  }
}

export default async function CatalogPage({ params, searchParams }: Props) {
  const { slug } = await params
  const rawSearchParams = await searchParams

  const slugPath = getSlugPath(slug)
  const urlSearchParams = toURLSearchParams(rawSearchParams)

  // Тот же порядок резолва categoryId, что и в CatalogAdsGrid/AdsClient на
  // клиенте (последний сегмент пути, либо ?category= как запасной вариант)
  // — намеренно НЕ через buildCategoryMap/fullPath, как выше в
  // generateMetadata: если бы серверный запрос объявлений и клиентский
  // рефетч резолвили категорию по-разному, первая отрисовка могла бы
  // показать не те объявления, что подставит клиент при смене фильтра.
  const categorySlug = slugPath?.split('/').at(-1) ?? rawSearchParams.category
  const categoryIdSlug = Array.isArray(categorySlug) ? categorySlug[0] : categorySlug

  const searchQuery = rawSearchParams.search
  const search = Array.isArray(searchQuery) ? searchQuery[0] : searchQuery

  const filters = parseCatalogFiltersFromSearchParams(urlSearchParams)

  let categoryId: string | undefined
  let initialAds: IAdsListResponse = { items: [], total: 0, page: 1, limit: CATALOG_PAGE_SIZE }
  let breadcrumbItems: JsonLdBreadcrumbItem[] = [{ name: 'Объявления', path: '/catalog' }]

  try {
    const categories = await getCategories()
    categoryId = findCategoryIdBySlug(categories, categoryIdSlug)
    breadcrumbItems = buildCatalogBreadcrumbItems(categories, slugPath)

    const adsParams = buildAdsQueryParams({ categoryId, search, filters })

    // revalidate 120с — в границах, которые просил аудит (60–300с, см. S1 в
    // ROADMAP.md): достаточно свежо для меняющихся цен/наличия объявлений,
    // и заметно снижает нагрузку на бэкенд/БД по сравнению с force-dynamic
    // (там КАЖДЫЙ заход на каталог бил в базу заново). Data Cache у Next
    // ключуется по итоговому URL запроса — то есть у каждой уникальной
    // комбинации категория+фильтры будет свой собственный кэш с своим
    // окном ревалидации, а не один общий кэш на весь каталог.
    initialAds = await adsService.findAll({ ...adsParams, page: 1, limit: CATALOG_PAGE_SIZE }, { next: { revalidate: 120 } })
  } catch {
    // Не роняем страницу целиком, если бэкенд на секунду недоступен —
    // сайдбар фильтра и заголовок категории всё равно отрисуются, список
    // объявлений просто останется пустым до следующего клиентского рефетча
    // (CatalogAdsGrid всё равно смонтируется и попробует сам).
  }

  return (
    <Container>
      {/* BreadcrumbList — та же цепочка, что показывают видимые хлебные
      крошки (CatalogBreadcrumbs). ItemList — только по уже отрисованному на
      сервере первому экрану объявлений (initialAds.items), см.
      buildAdsItemListJsonLd: то, что подгружается кнопкой «Показать ещё», в
      исходном HTML при заходе робота всё равно отсутствует. */}
      <JsonLd
        data={[
          buildBreadcrumbListJsonLd(breadcrumbItems),
          ...(initialAds.items.length ? [buildAdsItemListJsonLd(initialAds.items)] : [])
        ]}
      />
      <CatalogContent serverSlug={slugPath} initialAds={initialAds} />
    </Container>
  )
}
