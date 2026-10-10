import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { categoriesApi } from '../api/categories.api'
import type { Category, CategoryFeature } from '../types/category.types'

const EMPTY_FEATURES: readonly CategoryFeature[] = []

// Характеристики меняются вместе с деревом категорий — так же редко.
const FEATURES_STALE_TIME = 60 * 60_000

export function isLeafCategory(category: Category | undefined): boolean {
  return !!category && !category.children?.length
}

// Все характеристики категории (GET /categories/:id/features). Нет id —
// запрос не уходит.
export function useCategoryFeatures(categoryId: string | undefined): readonly CategoryFeature[] {
  const { data } = useQuery({
    queryKey: ['categories', 'features', categoryId],
    queryFn: ({ signal }) => categoriesApi.fetchFeatures(categoryId!, signal),
    enabled: !!categoryId,
    staleTime: FEATURES_STALE_TIME
  })

  return categoryId ? (data ?? EMPTY_FEATURES) : EMPTY_FEATURES
}

// Фильтры по характеристикам есть только у листовой категории — как на
// сайте: у раздела («Техника») общего набора характеристик нет. Для
// остальных запрос не уходит вовсе.
export function useFilterableFeatures(category: Category | undefined): readonly CategoryFeature[] {
  const features = useCategoryFeatures(category && isLeafCategory(category) ? category.id : undefined)

  return useMemo(() => features.filter(feature => feature.filterable && feature.type !== 'TEXT'), [features])
}
