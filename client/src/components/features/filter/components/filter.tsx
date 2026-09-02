'use client'

import { useEffect, useState } from 'react'

import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'

import { PRICE_UNITS } from '@/shared/constants/units'
import { USER_TYPE_LABELS, USER_TYPE_OPTIONS } from '@/shared/constants/user-types'

import { UserType } from '../../auth/types'
import { useCurrentCategory } from '../../categories/hooks/use-current-category'
import { ICategory } from '../../categories/types'
import { useCatalogFilters } from '../hooks/use-catalog-filters'
import { getEffectivePriceUnits, getEffectivePriceUnitsForAll } from '../utils/price-units'
import { FilterFeatureField } from './filter-feature-field'
import { LocationFilter } from './location-filter'
import { SubcategoryList } from './subcategory-list'

interface FilterProps {
  categories: ICategory[]
  // Прокидывается сверху, а не берётся тут же через useCatalogFilters() —
  // Filter переиспользуется и в десктопном сайдбаре (там фильтры
  // применяются сразу), и в мобильном полноэкранном окне (там — только по
  // кнопке "Показать", см. FilterModal), и решает это вызывающая сторона.
  filters: ReturnType<typeof useCatalogFilters>
}

export const Filter = ({ categories, filters }: FilterProps) => {
  const category = useCurrentCategory(categories)

  if (!category) {
    return (
      <div>
        {filters.hasActiveFilters && (
          <button
            type='button'
            onClick={filters.reset}
            className='text-secondary mb-6 hidden self-start text-sm hover:underline sm:block'
          >
            Сбросить фильтры
          </button>
        )}
        <aside className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:flex xl:flex-col'>
          <SubcategoryList categories={categories} onSelect={filters.selectCategory} />

          <PriceRangeFilter filters={filters} priceUnits={getEffectivePriceUnitsForAll(categories)} />

          <LocationFilter
            value={{ regionIsoCode: filters.regionIsoCode, localityFiasId: filters.localityFiasId }}
            onChange={patch => filters.update(patch)}
          />
        </aside>
      </div>
    )
  }

  const isLeafCategory = !category.children || category.children.length === 0

  const filterableFeatures = isLeafCategory
    ? (category.categoryFeatures ?? []).filter(f => f.filterable && f.type !== 'TEXT')
    : []

  return (
    <div>
      {filters.hasActiveFilters && (
        <button
          type='button'
          onClick={filters.reset}
          className='text-secondary mb-6 hidden self-start text-sm hover:underline sm:block'
        >
          Сбросить фильтры
        </button>
      )}
      <aside className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:flex xl:flex-col'>
        <PriceRangeFilter filters={filters} priceUnits={getEffectivePriceUnits(category)} />

        {!isLeafCategory && <SubcategoryList categories={category.children ?? []} onSelect={filters.selectCategory} />}

        <LocationFilter
          value={{ regionIsoCode: filters.regionIsoCode, localityFiasId: filters.localityFiasId }}
          onChange={patch => filters.update(patch)}
        />

        <SellerTypeFilter value={filters.sellerType} onChange={sellerType => filters.update({ sellerType })} />

        {filterableFeatures.map(feature => (
          <FilterFeatureField
            key={feature.id}
            feature={feature}
            value={filters.features[feature.name]}
            onChange={value => filters.setFeatureValue(feature.name, value)}
          />
        ))}
      </aside>
    </div>
  )
}

interface PriceRangeFilterProps {
  filters: ReturnType<typeof useCatalogFilters>
  priceUnits: string[]
}

const PriceRangeFilter = ({ filters, priceUnits }: PriceRangeFilterProps) => {
  const [unit, setUnit] = useState(filters.unit ?? priceUnits[0] ?? 'ITEM')
  const [min, setMin] = useState(filters.minPrice ?? '')
  const [max, setMax] = useState(filters.maxPrice ?? '')

  useEffect(() => {
    setUnit(filters.unit ?? priceUnits[0] ?? 'ITEM')
  }, [filters.unit, priceUnits])

  useEffect(() => {
    setMin(filters.minPrice ?? '')
  }, [filters.minPrice])

  useEffect(() => {
    setMax(filters.maxPrice ?? '')
  }, [filters.maxPrice])

  const commit = (nextUnit: string, nextMin: string, nextMax: string) => {
    if (!nextMin.trim() && !nextMax.trim()) {
      filters.update({ unit: undefined, minPrice: undefined, maxPrice: undefined })
      return
    }

    const parsedMin = nextMin.trim() === '' ? undefined : Number(nextMin)
    const parsedMax = nextMax.trim() === '' ? undefined : Number(nextMax)

    if (
      (parsedMin !== undefined && !Number.isFinite(parsedMin)) ||
      (parsedMax !== undefined && !Number.isFinite(parsedMax))
    ) {
      return
    }

    filters.update({
      unit: nextUnit,
      minPrice: parsedMin !== undefined ? String(parsedMin) : undefined,
      maxPrice: parsedMax !== undefined ? String(parsedMax) : undefined
    })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur()
  }

  return (
    <div className='flex flex-col gap-2'>
      <Label>Цена</Label>
      <div className='flex gap-2'>
        <Input
          type='number'
          placeholder='От'
          value={min}
          onChange={e => setMin(e.target.value)}
          onBlur={() => commit(unit, min, max)}
          onKeyDown={onKeyDown}
          className='h-11'
        />
        <Input
          type='number'
          placeholder='До'
          value={max}
          onChange={e => setMax(e.target.value)}
          onBlur={() => commit(unit, min, max)}
          onKeyDown={onKeyDown}
          className='h-11'
        />
      </div>

      {priceUnits.length > 1 && (
        <Select
          value={unit}
          onValueChange={(val: string | null) => {
            const nextUnit = val ?? priceUnits[0] ?? 'ITEM'
            setUnit(nextUnit)
            commit(nextUnit, min, max)
          }}
        >
          <SelectTrigger className='h-11! px-4'>
            <SelectValue placeholder='Единица цены'>
              {(value: string | null) => (value ? (PRICE_UNITS[value] ?? value) : 'Единица цены')}
            </SelectValue>
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align='start'>
            {priceUnits.map(u => (
              <SelectItem key={u} value={u} className='rounded-none px-4'>
                {PRICE_UNITS[u] ?? u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

interface SellerTypeFilterProps {
  value?: string
  onChange: (value: string | undefined) => void
}

const SellerTypeFilter = ({ value, onChange }: SellerTypeFilterProps) => {
  return (
    <div className='flex flex-col gap-2'>
      <Label>Тип продавца</Label>
      <Select value={value ?? ''} onValueChange={(val: string | null) => onChange(val || undefined)}>
        <SelectTrigger className='h-11! px-4'>
          <SelectValue placeholder='Все продавцы'>
            {(v: string | null) => (v ? (USER_TYPE_LABELS[v as UserType] ?? v) : 'Все продавцы')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} align='start'>
          <SelectItem value='' className='rounded-none px-4'>
            Все продавцы
          </SelectItem>
          {USER_TYPE_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value} className='rounded-none px-4'>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
