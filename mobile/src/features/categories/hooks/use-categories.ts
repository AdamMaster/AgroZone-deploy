import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { categoriesApi } from '../api/categories.api'
import { buildCategoryMap } from '../lib/category-map'

// Дерево категорий меняется очень редко (правит только админ), а нужно на
// главной, в каталоге и в окне подкатегорий — грузим один раз и держим в
// кэше час.
const CATEGORIES_STALE_TIME = 60 * 60_000

export function useCategories() {
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: ({ signal }) => categoriesApi.fetchTree(signal),
    staleTime: CATEGORIES_STALE_TIME,
    gcTime: CATEGORIES_STALE_TIME
  })

  const categoryMap = useMemo(() => buildCategoryMap(data ?? []), [data])
  const roots = useMemo(() => (data ?? []).filter(category => !category.parentId), [data])

  return { roots, categoryMap, error, isPending, refetch }
}
