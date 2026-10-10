import type { CategoryFeature } from '@/features/categories/types/category.types'

import { PRICE_UNITS_SHORT, WHOLE_PRICE_UNIT } from '@/shared/constants/price-units'
import { SELLER_TYPE_LABELS } from '@/shared/constants/seller-types'
import { formatRubles } from '@/shared/utils/format-price'

import type { CatalogFilters, LocationOption } from '../types/filter.types'
import {
  CLEARED_LOCATION,
  CLEARED_PRICE,
  CLEARED_RADIUS,
  DEFAULT_RADIUS_KM,
  hasOrigin,
  withFeatureValue
} from './catalog-filters'
import { findLocationOption } from './locations'

export interface FilterChip {
  key: string
  label: string
  // Фильтры без этого условия.
  without: CatalogFilters
}

function priceLabel({ unit, minPrice, maxPrice }: CatalogFilters): string {
  const suffix = unit && unit !== WHOLE_PRICE_UNIT ? `/${PRICE_UNITS_SHORT[unit] ?? unit}` : ''
  const format = (price: string) => `${formatRubles(Number(price))}${suffix}`

  if (minPrice && maxPrice) return `Цена: ${format(minPrice)} – ${format(maxPrice)}`
  return minPrice ? `Цена: от ${format(minPrice)}` : `Цена: до ${format(maxPrice!)}`
}

// Применённые фильтры чипами над выдачей — тексты те же, что у
// ActiveFilterChips сайта. Каждый чип снимает только своё условие.
export function buildFilterChips(
  filters: CatalogFilters,
  locations: readonly LocationOption[],
  features: readonly CategoryFeature[]
): FilterChip[] {
  const chips: FilterChip[] = []
  const without = (patch: Partial<CatalogFilters>): CatalogFilters => ({ ...filters, ...patch })

  if (filters.minPrice || filters.maxPrice) {
    chips.push({ key: 'price', label: priceLabel(filters), without: without(CLEARED_PRICE) })
  }

  if (filters.sellerType) {
    chips.push({
      key: 'sellerType',
      label: `Продавец: ${SELLER_TYPE_LABELS[filters.sellerType]}`,
      without: without({ sellerType: undefined })
    })
  }

  // Название места есть только в списке локаций: пока он не загружен, чипа
  // нет (как на сайте).
  const location = findLocationOption(locations, filters)
  if (location) {
    chips.push({ key: 'location', label: `Локация: ${location.label}`, without: without(CLEARED_LOCATION) })
  }

  if (hasOrigin(filters)) {
    chips.push({
      key: 'radius',
      label: `${filters.originLabel ?? 'Точка на карте'} · ${filters.radiusKm ?? DEFAULT_RADIUS_KM} км`,
      without: without(CLEARED_RADIUS)
    })
  }

  for (const feature of features) {
    const value = filters.features[feature.name]
    if (value === undefined) continue

    const withoutValue = (next: typeof value | undefined) =>
      without({ features: withFeatureValue(filters.features, feature.name, next) })

    if (Array.isArray(value)) {
      // Отдельный чип на каждый вариант: можно снять один, не трогая
      // остальные.
      for (const option of value) {
        chips.push({
          key: `feature:${feature.name}:${option}`,
          label: `${feature.label}: ${option}`,
          without: withoutValue(value.filter(item => item !== option))
        })
      }
      continue
    }

    if (typeof value === 'boolean') {
      if (value) chips.push({ key: `feature:${feature.name}`, label: feature.label, without: withoutValue(undefined) })
      continue
    }

    const { min, max } = value
    if (min === undefined && max === undefined) continue

    const unit = feature.units?.[0] ? ` ${feature.units[0]}` : ''
    const range =
      min !== undefined && max !== undefined
        ? `${min}–${max}${unit}`
        : min !== undefined
          ? `от ${min}${unit}`
          : `до ${max}${unit}`

    chips.push({
      key: `feature:${feature.name}`,
      label: `${feature.label}: ${range}`,
      without: withoutValue(undefined)
    })
  }

  return chips
}
