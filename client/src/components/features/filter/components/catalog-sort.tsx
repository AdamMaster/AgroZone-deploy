'use client'

import { useEffect } from 'react'

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

// distance_asc (F3) — отдельно от SORT_OPTIONS выше и добавляется в
// список условно: сортировка по расстоянию без точки поиска (lat/lng) на
// бэкенде — 400 (см. AdsService.findAll), так что показывать её, когда
// радиус-фильтр не активен, было бы только приглашением словить ошибку.
const DISTANCE_SORT_OPTION = { value: 'distance_asc', label: 'Сначала ближайшие' }

const DEFAULT_SORT = SORT_OPTIONS[0].value

const LABEL_BY_VALUE = Object.fromEntries([...SORT_OPTIONS, DISTANCE_SORT_OPTION].map(o => [o.value, o.label]))

export const CatalogSort = () => {
  const filters = useCatalogFilters()

  const hasOrigin = Boolean(filters.lat && filters.lng)

  // Если у пользователя была выбрана сортировка по расстоянию и он потом
  // сбросил радиус-точку (в LocationFilterSection) — реально убираем
  // sortBy из URL, а не только из отображаемого значения ниже: иначе
  // ?sortBy=distance_asc остался бы в адресной строке, и следующий же
  // запрос к /ads улетел бы без lat/lng и получил 400 от бэкенда (см.
  // AdsService.findAll).
  useEffect(() => {
    if (!hasOrigin && filters.sortBy === 'distance_asc') {
      filters.update({ sortBy: undefined })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasOrigin, filters.sortBy])

  const value = filters.sortBy === 'distance_asc' && !hasOrigin ? DEFAULT_SORT : (filters.sortBy ?? DEFAULT_SORT)
  const options = hasOrigin ? [DISTANCE_SORT_OPTION, ...SORT_OPTIONS] : SORT_OPTIONS

  return (
    <Select
      value={value}
      onValueChange={(val: string | null) => filters.update({ sortBy: !val || val === DEFAULT_SORT ? undefined : val })}
    >
      <SelectTrigger className='h-11! px-4'>
        <SelectValue>{(v: string | null) => (v ? (LABEL_BY_VALUE[v] ?? v) : LABEL_BY_VALUE[DEFAULT_SORT])}</SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} align='end'>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value} className='rounded-none px-4'>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
