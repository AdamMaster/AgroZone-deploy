import { useQuery } from '@tanstack/react-query'

import { categoriesApi } from '../api/categories.api'
import type { Category, CategoryFeature } from '../types/category.types'

const EMPTY_FEATURES: readonly CategoryFeature[] = []

// Характеристики меняются вместе с деревом категорий — так же редко.
const FEATURES_STALE_TIME = 60 * 60_000

export function isLeafCategory(category: Category | undefined): boolean {
  return !!category && !category.children?.length
}

// Фильтры по характеристикам есть только у листовой категории — как на
// сайте: у раздела («Техника») общего набора характеристик нет. Для
// остальных запрос не уходит вовсе.
export function useFilterableFeatures(category: Category | undefined): readonly CategoryFeature[] {
  const leafId = category && isLeafCategory(category) ? category.id : undefined

  const { data } = useQuery({
    queryKey: ['categories', 'features', leafId],
    queryFn: ({ signal }) => categoriesApi.fetchFeatures(leafId!, signal),
    enabled: !!leafId,
    staleTime: FEATURES_STALE_TIME,
    select: features => features.filter(feature => feature.filterable && feature.type !== 'TEXT')
  })

  return leafId ? (data ?? EMPTY_FEATURES) : EMPTY_FEATURES
}
