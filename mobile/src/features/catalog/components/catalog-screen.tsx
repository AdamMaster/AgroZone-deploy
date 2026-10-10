import { useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Text, View } from 'react-native'

import { AdsGrid } from '@/features/ads/components/ads-grid'
import { useAdsInfinite } from '@/features/ads/hooks/use-ads-infinite'
import { useCategories } from '@/features/categories/hooks/use-categories'
import { getCategoryTrail } from '@/features/categories/lib/category-map'
import { ActiveFilterChips } from '@/features/filters/components/active-filter-chips'
import { CatalogSort } from '@/features/filters/components/catalog-sort'
import { DEFAULT_SORT } from '@/features/filters/constants/sort-options'
import type { RouteCatalogFilters } from '@/features/filters/hooks/use-route-catalog-filters'
import { hasOrigin, toAdsFilters } from '@/features/filters/lib/catalog-filters'
import { SearchHeader } from '@/features/search/components/search-header'

import { Heading } from '@/shared/components/heading'
import { ScreenMessage } from '@/shared/components/screen-message'
import { pluralizeRu } from '@/shared/utils/pluralize'

import { type BreadcrumbItem, CatalogBreadcrumbs } from './catalog-breadcrumbs'

interface CatalogScreenProps {
  // Путь категории (как /catalog/<путь> на сайте); нет — весь каталог.
  categoryPath?: string
  search?: string
  onClearSearch: () => void
  // Фильтры и сортировка — в параметрах экрана.
  catalogFilters: RouteCatalogFilters
}

// Длинный запрос в тексте «ничего не найдено» обрезаем — как сайт.
const MAX_DISPLAYED_QUERY_LENGTH = 80

const formatDisplayedQuery = (query: string) =>
  query.length > MAX_DISPLAYED_QUERY_LENGTH ? `${query.slice(0, MAX_DISPLAYED_QUERY_LENGTH)}…` : query

// Каталог — как страница /catalog сайта на телефоне: строка поиска с
// фильтром, хлебные крошки, заголовок (категория или «Объявления»),
// применённые фильтры, сортировка, число найденных и сетка объявлений.
export function CatalogScreen({ categoryPath, search, onClearSearch, catalogFilters }: CatalogScreenProps) {
  const { filters, setFilters, openCategory } = catalogFilters
  const router = useRouter()
  const { categoryMap, isPending: isCategoriesPending, error: categoriesError, refetch } = useCategories()
  const lookup = categoryPath ? categoryMap.get(categoryPath) : undefined
  const category = lookup?.category
  const trimmedSearch = search?.trim() ?? ''

  // Выдачу запрашиваем, только когда известен id категории — иначе первым
  // запросом ушёл бы весь каталог, а потом его сменила бы категория.
  const isWaitingForCategory = Boolean(categoryPath) && !category
  const adsFilters = useMemo(
    () => toAdsFilters({ categoryId: category?.id, search: trimmedSearch || undefined, filters }),
    [category, trimmedSearch, filters]
  )
  const query = useAdsInfinite(adsFilters, { enabled: !isWaitingForCategory })

  if (categoryPath && !isCategoriesPending && !category) {
    return categoriesError ? (
      <ScreenMessage
        title='Не удалось загрузить категории'
        description={categoriesError.message}
        action={{ title: 'Повторить', onPress: () => void refetch() }}
      />
    ) : (
      <ScreenMessage title='Категория не найдена' description='Возможно, её переименовали или убрали из каталога' />
    )
  }

  const trail = categoryPath ? getCategoryTrail(categoryMap, categoryPath) : []
  const breadcrumbs: BreadcrumbItem[] = trail.length
    ? [
        { name: 'Объявления', onPress: () => router.push('/catalog') },
        ...trail.map((item, index) => ({
          name: item.name,
          onPress:
            index < trail.length - 1
              ? () => router.push({ pathname: '/catalog', params: { category: item.fullPath } })
              : undefined
        }))
      ]
    : []
  // Верхний уровень каталога без отступа сверху — как у сайта.
  const isTopLevelCategory = Boolean(categoryPath) && !categoryPath?.includes('/')

  const emptyMessage = trimmedSearch
    ? `По запросу «${formatDisplayedQuery(trimmedSearch)}» ничего не найдено`
    : 'В этой категории пока нет объявлений'

  const header = (
    <View>
      <SearchHeader
        query={trimmedSearch}
        onClear={onClearSearch}
        filters={filters}
        category={category}
        onApplyFilters={setFilters}
        onOpenCategory={openCategory}
      />
      {breadcrumbs.length > 0 && <CatalogBreadcrumbs items={breadcrumbs} />}
      <View className={isTopLevelCategory ? '' : 'pt-4'}>
        <Heading level={2} className='mb-4'>
          {category?.name ?? 'Объявления'}
        </Heading>
        <ActiveFilterChips filters={filters} category={category} onChange={setFilters} />
        <View className='mb-4'>
          <CatalogSort
            value={filters.sortBy ?? DEFAULT_SORT}
            hasOrigin={hasOrigin(filters)}
            onChange={sortBy => setFilters({ ...filters, sortBy: sortBy === DEFAULT_SORT ? undefined : sortBy })}
          />
        </View>
        {query.total > 0 && (
          <Text className='mb-3 text-sm text-gray-500'>
            Найдено {query.total} {pluralizeRu(query.total, ['объявление', 'объявления', 'объявлений'])}
          </Text>
        )}
      </View>
    </View>
  )

  return <AdsGrid query={query} header={header} emptyMessage={emptyMessage} />
}
