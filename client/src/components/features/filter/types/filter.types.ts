// Значение фильтра по одной динамической характеристике категории —
// форма зависит от CategoryFeature.type:
//  - SELECT / MULTI_SELECT — набор выбранных вариантов (совпадение по ИЛИ);
//  - NUMBER — диапазон;
//  - BOOLEAN — точное совпадение (true — показывать только "да").
// Совпадает по форме с тем, что ожидает AdsService.resolveFeatureFilters
// на бэкенде (server/src/ads/ads.service.ts).
export type FeatureFilterValue = string[] | { min?: number; max?: number } | boolean

export type FeatureFiltersMap = Record<string, FeatureFilterValue>

export interface CatalogFiltersState {
  sortBy?: string
  unit?: string
  minPrice?: string
  maxPrice?: string
  // Локация — действует на любом уровне каталога, не зависит от выбранной
  // категории (в отличие от features). Ровно одно из двух — либо весь
  // регион (regionIsoCode), либо конкретный город/село (localityFiasId),
  // см. LocationFilter.
  regionIsoCode?: string
  localityFiasId?: string
  // Частное лицо / ИП / компания — как и regionIsoCode/localityFiasId,
  // действует на любом уровне каталога независимо от выбранной категории
  // (в отличие от features). Значение — UserType с бэкенда (см.
  // FindAdsQueryDto.sellerType на сервере).
  sellerType?: string
  features: FeatureFiltersMap
}
