import { useLocalSearchParams, useRouter } from 'expo-router'
import { useCallback, useMemo } from 'react'

import { parseCatalogFilters, toCatalogFiltersParams } from '../lib/catalog-filters'
import type { CatalogFilters } from '../types/filter.types'

// Фильтры выдачи текущего экрана (главная или каталог) — хранятся в его
// параметрах, как фильтры сайта в адресе страницы (useCatalogFilters).
// Экран можно открыть ссылкой с уже заданными фильтрами, а «Назад»
// возвращает к предыдущей выдаче вместе с её фильтрами.
export function useRouteCatalogFilters() {
  const router = useRouter()
  const params = useLocalSearchParams()
  const filters = useMemo(() => parseCatalogFilters(params), [params])

  // Меняет все фильтры разом: окно фильтров применяет накопленные
  // изменения одним действием («Показать»), чип снимает один фильтр.
  const setFilters = useCallback((next: CatalogFilters) => router.setParams(toCatalogFiltersParams(next)), [router])

  // Выбор категории в окне фильтров — переход в каталог этой категории.
  // Остальные фильтры не переносим, как и сайт: характеристики у каждой
  // категории свои.
  const openCategory = useCallback(
    (categoryPath: string) => router.push({ pathname: '/catalog', params: { category: categoryPath } }),
    [router]
  )

  return { filters, setFilters, openCategory }
}

export type RouteCatalogFilters = ReturnType<typeof useRouteCatalogFilters>
