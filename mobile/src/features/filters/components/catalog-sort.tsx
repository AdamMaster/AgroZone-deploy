import type { AdsSortBy } from '@/features/ads/types/ad.types'

import { SelectField } from '@/shared/components/select-field'

import { getSortOptions } from '../constants/sort-options'

interface CatalogSortProps {
  value: AdsSortBy
  // Задана точка поиска по радиусу — появляется «Сначала ближайшие».
  hasOrigin: boolean
  onChange: (value: AdsSortBy) => void
}

// Сортировка каталога — как CatalogSort сайта: поле с текущим вариантом,
// варианты — снизу экрана.
export function CatalogSort({ value, hasOrigin, onChange }: CatalogSortProps) {
  return (
    <SelectField
      value={value}
      options={getSortOptions(hasOrigin)}
      onChange={onChange}
      accessibilityLabel='Сортировка'
    />
  )
}
