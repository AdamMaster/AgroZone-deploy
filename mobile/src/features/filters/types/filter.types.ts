import type { AdsSortBy } from '@/features/ads/types/ad.types'

import type { SellerType } from '@/shared/constants/seller-types'

// Значение фильтра по одной характеристике категории — форма зависит от
// CategoryFeature.type, как и на сайте (FeatureFilterValue):
//  - SELECT / MULTI_SELECT — выбранные варианты (совпадение по ИЛИ);
//  - NUMBER — диапазон;
//  - BOOLEAN — true: только «да».
// Сервер разбирает это в AdsService.resolveFeatureFilters.
export type FeatureFilterValue = string[] | { min?: number; max?: number } | boolean

export type FeatureFiltersMap = Readonly<Record<string, FeatureFilterValue>>

// Регион целиком или конкретный город/село — ровно одно из двух.
export interface LocationFilterValue {
  regionIsoCode?: string
  localityFiasId?: string
}

// Поиск в радиусе от точки — альтернатива региону/городу. originLabel —
// подпись точки (адрес или «Моё местоположение») только для показа: на
// сервер не уходит.
export interface RadiusFilterValue {
  lat?: string
  lng?: string
  radiusKm?: string
  originLabel?: string
}

// Фильтры выдачи — те же, что параметры адреса каталога сайта
// (CatalogFiltersState). Числа хранятся строками, как в адресе: фильтры
// живут в параметрах экрана, и их можно открыть ссылкой.
export interface CatalogFilters extends LocationFilterValue, RadiusFilterValue {
  sortBy?: AdsSortBy
  unit?: string
  minPrice?: string
  maxPrice?: string
  sellerType?: SellerType
  features: FeatureFiltersMap
}

// Вариант локации из GET /ads/locations: регионы и населённые пункты, где
// есть объявления, плюс крупные города из справочника.
export interface LocationOption {
  type: 'region' | 'locality'
  label: string
  regionIsoCode?: string
  localityFiasId?: string
}
