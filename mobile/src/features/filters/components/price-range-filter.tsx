import { useState } from 'react'
import { View } from 'react-native'

import { FieldLabel } from '@/shared/components/field-label'
import { Input } from '@/shared/components/input'
import { SelectField } from '@/shared/components/select-field'
import { PRICE_UNITS, WHOLE_PRICE_UNIT } from '@/shared/constants/price-units'

import { CLEARED_PRICE } from '../lib/catalog-filters'
import type { CatalogFilters } from '../types/filter.types'

type PriceValue = Pick<CatalogFilters, 'unit' | 'minPrice' | 'maxPrice'>

interface PriceRangeFilterProps {
  value: PriceValue
  // Единицы цены, которые встречаются в текущей категории.
  priceUnits: readonly string[]
  onChange: (value: PriceValue) => void
}

// Длиннее — уже не цена, а опечатка; заодно Number() не уходит в
// экспоненциальную запись.
const MAX_PRICE_LENGTH = 12

// Только цифры, без ведущих нулей: «007» — это 7.
const normalizePrice = (text: string) => {
  const digits = text.replace(/\D/g, '')
  return digits ? String(Number(digits)) : ''
}

// Цена «от — до» и единица — как PriceRangeFilter сайта. Единица уходит в
// фильтр только вместе с ценой: без цены она ничего не ограничивает.
export function PriceRangeFilter({ value, priceUnits, onChange }: PriceRangeFilterProps) {
  // Выбор пользователя; пока он ничего не выбрал — единица из фильтра или
  // первая доступная (список единиц может догрузиться позже).
  const [chosenUnit, setChosenUnit] = useState<string>()
  const unit = chosenUnit ?? value.unit ?? priceUnits[0] ?? WHOLE_PRICE_UNIT

  const commit = (nextUnit: string, minPrice: string, maxPrice: string) => {
    onChange(
      minPrice || maxPrice
        ? { unit: nextUnit, minPrice: minPrice || undefined, maxPrice: maxPrice || undefined }
        : CLEARED_PRICE
    )
  }

  const minPrice = value.minPrice ?? ''
  const maxPrice = value.maxPrice ?? ''

  return (
    <View className='gap-2'>
      <FieldLabel>Цена</FieldLabel>
      <View className='flex-row gap-2'>
        <Input
          isFluid
          value={minPrice}
          onChangeText={text => commit(unit, normalizePrice(text), maxPrice)}
          placeholder='От'
          accessibilityLabel='Цена от'
          keyboardType='number-pad'
          maxLength={MAX_PRICE_LENGTH}
        />
        <Input
          isFluid
          value={maxPrice}
          onChangeText={text => commit(unit, minPrice, normalizePrice(text))}
          placeholder='До'
          accessibilityLabel='Цена до'
          keyboardType='number-pad'
          maxLength={MAX_PRICE_LENGTH}
        />
      </View>

      {priceUnits.length > 1 && (
        <SelectField
          width='full'
          value={unit}
          options={priceUnits.map(item => ({ value: item, label: PRICE_UNITS[item] ?? item }))}
          onChange={nextUnit => {
            setChosenUnit(nextUnit)
            commit(nextUnit, minPrice, maxPrice)
          }}
          accessibilityLabel='Единица цены'
          placeholder='Единица цены'
        />
      )}
    </View>
  )
}
