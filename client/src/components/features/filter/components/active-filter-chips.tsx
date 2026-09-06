'use client'

import { X } from 'lucide-react'

import { PRICE_UNITS_SHORT } from '@/shared/constants/units'
import { USER_TYPE_LABELS } from '@/shared/constants/user-types'
import { formatPrice } from '@/shared/utils'

import { UserType } from '../../auth/types'
import { useCategoryFeatures } from '../../categories/hooks/use-category-features'
import { useCurrentCategory } from '../../categories/hooks/use-current-category'
import { ICategory } from '../../categories/types'
import { useCatalogFilters } from '../hooks/use-catalog-filters'
import { useLocations } from '../hooks/use-locations'

interface ActiveFilterChipsProps {
  categories: ICategory[]
  filters: ReturnType<typeof useCatalogFilters>
}

interface Chip {
  key: string
  label: string
  onRemove: () => void
}

// Компактная сводка активных фильтров прямо над выдачей — раньше единственным
// способом узнать, что вообще сейчас применено, было открыть сайдбар/окно
// фильтра и построчно просмотреть каждое поле. На мобильном это особенно
// заметно: сайдбар там вообще не показывается (см. CatalogContent — `hidden
// md:block`), и до этого компонента у мобильного пользователя не было НИ
// ОДНОГО способа увидеть список применённых фильтров, не открывая заново
// полноэкранное окно. Каждый чип снимается по отдельности кликом — не нужно
// открывать фильтр и искать там нужное поле, чтобы сбросить только его.
//
// Дублирует часть хуков Filter (useCurrentCategory/useCategoryFeatures) —
// намеренно: тот же паттерн, что и у AdsClient/CatalogAdsGrid, независимо
// вызывающих useCategories()/useCatalogFilters() и полагающихся на то, что
// react-query дедуплицирует одинаковый queryKey в один сетевой запрос,
// вместо того чтобы тащить пропsы через дерево или заводить общий контекст
// ради одного маленького компонента.
export const ActiveFilterChips = ({ categories, filters }: ActiveFilterChipsProps) => {
  const category = useCurrentCategory(categories)
  const isLeafCategory = !!category && (!category.children || category.children.length === 0)
  const { features: categoryFeatures } = useCategoryFeatures(isLeafCategory ? category!.id : undefined)
  const { locations } = useLocations()

  const chips: Chip[] = []

  if (filters.minPrice || filters.maxPrice) {
    const unitSuffix =
      filters.unit && filters.unit !== 'ITEM' ? `/${PRICE_UNITS_SHORT[filters.unit] ?? filters.unit}` : ''

    const label =
      filters.minPrice && filters.maxPrice
        ? `Цена: ${formatPrice(Number(filters.minPrice))}${unitSuffix} – ${formatPrice(Number(filters.maxPrice))}${unitSuffix}`
        : filters.minPrice
          ? `Цена: от ${formatPrice(Number(filters.minPrice))}${unitSuffix}`
          : `Цена: до ${formatPrice(Number(filters.maxPrice))}${unitSuffix}`

    chips.push({
      key: 'price',
      label,
      onRemove: () => filters.update({ unit: undefined, minPrice: undefined, maxPrice: undefined })
    })
  }

  if (filters.sellerType) {
    chips.push({
      key: 'sellerType',
      label: `Продавец: ${USER_TYPE_LABELS[filters.sellerType as UserType] ?? filters.sellerType}`,
      onRemove: () => filters.update({ sellerType: undefined })
    })
  }

  if (filters.regionIsoCode || filters.localityFiasId) {
    // Тот же способ найти подпись выбранной локации, что и в самом
    // LocationFilter (см. его useEffect) — стабильные ключи (fiasId/isoCode)
    // не содержат человекочитаемого названия, оно только в списке locations.
    const option = locations.find(item =>
      filters.localityFiasId
        ? item.type === 'locality' && item.localityFiasId === filters.localityFiasId
        : item.type === 'region' && item.regionIsoCode === filters.regionIsoCode
    )

    if (option) {
      chips.push({
        key: 'location',
        label: `Локация: ${option.label}`,
        onRemove: () => filters.update({ regionIsoCode: undefined, localityFiasId: undefined })
      })
    }
  }

  for (const feature of categoryFeatures) {
    const value = filters.features[feature.name]

    if (value === undefined) continue

    if (Array.isArray(value)) {
      // SELECT/MULTI_SELECT — отдельный чип на каждый выбранный вариант:
      // так можно снять один вариант, не сбрасывая остальные выбранные
      // разом (в отличие от NUMBER/BOOLEAN ниже, где значение и так одно).
      for (const option of value) {
        chips.push({
          key: `feature:${feature.name}:${option}`,
          label: `${feature.label}: ${option}`,
          onRemove: () => {
            const next = value.filter(v => v !== option)
            filters.setFeatureValue(feature.name, next.length ? next : undefined)
          }
        })
      }

      continue
    }

    if (typeof value === 'boolean') {
      if (!value) continue

      chips.push({
        key: `feature:${feature.name}`,
        label: feature.label,
        onRemove: () => filters.setFeatureValue(feature.name, undefined)
      })

      continue
    }

    const { min, max } = value

    if (min === undefined && max === undefined) continue

    // Каноническая единица — то же обоснование, что и в NumberRangeField
    // (filter-feature-field.tsx): значение хранится и фильтруется именно в
    // ней, так что чип должен показывать её же, а не выдумывать другую.
    const unit = feature.units?.[0] ? ` ${feature.units[0]}` : ''

    const rangeLabel =
      min !== undefined && max !== undefined
        ? `${min}–${max}${unit}`
        : min !== undefined
          ? `от ${min}${unit}`
          : `до ${max}${unit}`

    chips.push({
      key: `feature:${feature.name}`,
      label: `${feature.label}: ${rangeLabel}`,
      onRemove: () => filters.setFeatureValue(feature.name, undefined)
    })
  }

  if (!chips.length) return null

  return (
    <div className='mb-4 flex flex-wrap gap-2 sm:mb-6'>
      {chips.map(chip => (
        <button
          key={chip.key}
          type='button'
          onClick={chip.onRemove}
          className='border-border bg-background hover:bg-muted inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors'
        >
          <span>{chip.label}</span>
          <X className='size-3.5 text-gray-500' />
        </button>
      ))}
    </div>
  )
}
