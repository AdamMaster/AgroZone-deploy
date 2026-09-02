'use client'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui'

import { useCatalogFilters } from '../hooks/use-catalog-filters'

// Значения совпадают с AdsSortBy на бэкенде
// (server/src/ads/dto/find-ads-query.dto.ts).
const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'date_desc', label: 'Сначала новые' },
  { value: 'date_asc', label: 'Сначала старые' },
  { value: 'price_asc', label: 'Сначала дешевле' },
  { value: 'price_desc', label: 'Сначала дороже' }
]

const DEFAULT_SORT = SORT_OPTIONS[0].value

const LABEL_BY_VALUE = Object.fromEntries(SORT_OPTIONS.map(o => [o.value, o.label]))

export const CatalogSort = () => {
  const filters = useCatalogFilters()

  const value = filters.sortBy ?? DEFAULT_SORT

  return (
    <Select
      value={value}
      onValueChange={(val: string | null) => filters.update({ sortBy: !val || val === DEFAULT_SORT ? undefined : val })}
    >
      <SelectTrigger className='h-11! px-4'>
        <SelectValue>{(v: string | null) => (v ? (LABEL_BY_VALUE[v] ?? v) : LABEL_BY_VALUE[DEFAULT_SORT])}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align='end'>
        {SORT_OPTIONS.map(option => (
          <SelectItem key={option.value} value={option.value} className='rounded-none px-4'>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
