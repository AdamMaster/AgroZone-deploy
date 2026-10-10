import type { AdsSortBy } from '@/features/ads/types/ad.types'

import type { SheetOption } from '@/shared/components/options-sheet'

// Те же варианты и подписи, что у CatalogSort сайта.
const SORT_OPTIONS: readonly SheetOption<AdsSortBy>[] = [
  { value: 'date_desc', label: 'Сначала новые' },
  { value: 'date_asc', label: 'Сначала старые' },
  { value: 'price_asc', label: 'Сначала дешевле' },
  { value: 'price_desc', label: 'Сначала дороже' }
]

// По расстоянию можно сортировать только при поиске по радиусу: без точки
// (lat/lng) сервер отвечает на такой запрос ошибкой 400.
export const DISTANCE_SORT: AdsSortBy = 'distance_asc'

const SORT_OPTIONS_WITH_DISTANCE: readonly SheetOption<AdsSortBy>[] = [
  { value: DISTANCE_SORT, label: 'Сначала ближайшие' },
  ...SORT_OPTIONS
]

export const DEFAULT_SORT: AdsSortBy = 'date_desc'

export function getSortOptions(hasOrigin: boolean): readonly SheetOption<AdsSortBy>[] {
  return hasOrigin ? SORT_OPTIONS_WITH_DISTANCE : SORT_OPTIONS
}

export function isAdsSortBy(value: unknown): value is AdsSortBy {
  return SORT_OPTIONS_WITH_DISTANCE.some(option => option.value === value)
}
