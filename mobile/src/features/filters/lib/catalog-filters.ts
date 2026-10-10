import type { AdsFilters } from '@/features/ads/types/ad.types'

import { isSellerType } from '@/shared/constants/seller-types'

import { DISTANCE_SORT, isAdsSortBy } from '../constants/sort-options'
import type {
  CatalogFilters,
  FeatureFilterValue,
  FeatureFiltersMap,
  LocationFilterValue,
  RadiusFilterValue
} from '../types/filter.types'

// Имена параметров — те же, что в адресе каталога сайта
// (use-catalog-filters.ts), чтобы ссылки сайта и приложения совпадали.
const SCALAR_PARAMS = [
  'sortBy',
  'unit',
  'minPrice',
  'maxPrice',
  'regionIsoCode',
  'localityFiasId',
  'sellerType',
  'lat',
  'lng',
  'radiusKm',
  'originLabel'
] as const satisfies readonly (keyof CatalogFilters)[]

const FEATURES_PARAM = 'features'

export type CatalogFiltersParams = Partial<Record<(typeof SCALAR_PARAMS)[number] | typeof FEATURES_PARAM, string>>

type RouteParams = Readonly<Record<string, string | string[] | undefined>>

export const EMPTY_FILTERS: CatalogFilters = { features: {} }

// Радиус по умолчанию, когда точка поиска только что задана.
export const DEFAULT_RADIUS_KM = '50'

export const CLEARED_LOCATION: Record<keyof LocationFilterValue, undefined> = {
  regionIsoCode: undefined,
  localityFiasId: undefined
}

export const CLEARED_RADIUS: Record<keyof RadiusFilterValue, undefined> = {
  lat: undefined,
  lng: undefined,
  radiusKm: undefined,
  originLabel: undefined
}

export const CLEARED_PRICE = { unit: undefined, minPrice: undefined, maxPrice: undefined } as const

// Пустое условие только засоряло бы адрес и запрос.
export function isEmptyFeatureValue(value: FeatureFilterValue): boolean {
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'boolean') return !value
  return value.min === undefined && value.max === undefined
}

const isFiniteNumberOrUndefined = (value: unknown) =>
  value === undefined || (typeof value === 'number' && Number.isFinite(value))

function isFeatureFilterValue(value: unknown): value is FeatureFilterValue {
  if (typeof value === 'boolean') return true
  if (Array.isArray(value)) return value.every(item => typeof item === 'string')
  if (!value || typeof value !== 'object') return false

  const { min, max } = value as Record<string, unknown>
  return isFiniteNumberOrUndefined(min) && isFiniteNumberOrUndefined(max)
}

// Параметр пришёл из ссылки — его могли отредактировать руками. Битые
// условия отбрасываем, а не отправляем на сервер (он ответил бы 400 на
// весь запрос).
function parseFeatures(raw: string | undefined): FeatureFiltersMap {
  if (!raw) return {}

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, FeatureFilterValue] =>
          isFeatureFilterValue(entry[1]) && !isEmptyFeatureValue(entry[1])
      )
    )
  } catch {
    return {}
  }
}

const firstParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) || undefined

export const hasOrigin = (filters: RadiusFilterValue) => Boolean(filters.lat && filters.lng)

// Сортировка по расстоянию без точки поиска невозможна (сервер ответит
// 400) — например, точку сняли чипом. Возвращаемся к сортировке по
// умолчанию, как CatalogSort сайта.
export function normalizeFilters(filters: CatalogFilters): CatalogFilters {
  return filters.sortBy === DISTANCE_SORT && !hasOrigin(filters) ? { ...filters, sortBy: undefined } : filters
}

export function parseCatalogFilters(params: RouteParams): CatalogFilters {
  const sortBy = firstParam(params.sortBy)
  const sellerType = firstParam(params.sellerType)

  return normalizeFilters({
    sortBy: isAdsSortBy(sortBy) ? sortBy : undefined,
    unit: firstParam(params.unit),
    minPrice: firstParam(params.minPrice),
    maxPrice: firstParam(params.maxPrice),
    regionIsoCode: firstParam(params.regionIsoCode),
    localityFiasId: firstParam(params.localityFiasId),
    sellerType: isSellerType(sellerType) ? sellerType : undefined,
    lat: firstParam(params.lat),
    lng: firstParam(params.lng),
    radiusKm: firstParam(params.radiusKm),
    originLabel: firstParam(params.originLabel),
    features: parseFeatures(firstParam(params[FEATURES_PARAM]))
  })
}

// Все параметры фильтра, включая пустые (undefined): при записи в экран
// снятый фильтр должен исчезнуть из параметров, а не остаться прежним.
export function toCatalogFiltersParams(filters: CatalogFilters): CatalogFiltersParams {
  const normalized = normalizeFilters(filters)
  const params: CatalogFiltersParams = {}

  for (const key of SCALAR_PARAMS) {
    params[key] = normalized[key] || undefined
  }

  params[FEATURES_PARAM] = Object.keys(normalized.features).length ? JSON.stringify(normalized.features) : undefined

  return params
}

// Сортировка — не фильтр: «есть активные фильтры» её не учитывает, как и
// на сайте.
export function hasActiveFilters(filters: CatalogFilters): boolean {
  return Boolean(
    filters.unit ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.regionIsoCode ||
    filters.localityFiasId ||
    filters.sellerType ||
    hasOrigin(filters) ||
    Object.keys(filters.features).length
  )
}

interface ToAdsFiltersInput {
  categoryId?: string
  search?: string
  filters: CatalogFilters
}

// Условия запроса GET /ads — как buildAdsQueryParams сайта. originLabel не
// отправляем: у сервера нет такого параметра, а лишний параметр он
// отклоняет (forbidNonWhitelisted). Пустые поля не включаем вовсе — от
// объекта зависит ключ кэша выдачи.
export function toAdsFilters({ categoryId, search, filters }: ToAdsFiltersInput): AdsFilters {
  const normalized = normalizeFilters(filters)
  const { originLabel: _originLabel, features, ...scalars } = normalized
  const entries = Object.entries({
    categoryId,
    search,
    ...scalars,
    features: Object.keys(features).length ? JSON.stringify(features) : undefined
  }).filter(([, value]) => value !== undefined && value !== '')

  return Object.fromEntries(entries) as AdsFilters
}

// Новый набор условий по характеристикам: пустое значение убирает условие.
export function withFeatureValue(
  features: FeatureFiltersMap,
  name: string,
  value: FeatureFilterValue | undefined
): FeatureFiltersMap {
  if (value !== undefined && !isEmptyFeatureValue(value)) return { ...features, [name]: value }

  const { [name]: _removed, ...rest } = features
  return rest
}
