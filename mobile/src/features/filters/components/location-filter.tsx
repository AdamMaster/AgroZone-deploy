import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { Combobox } from '@/shared/components/combobox'
import { createTextMatcher } from '@/shared/utils/search-text'

import { useLocations } from '../hooks/use-locations'
import { CLEARED_LOCATION } from '../lib/catalog-filters'
import { findLocationOption, getLocationOptionKey, toLocationFilterValue } from '../lib/locations'
import type { LocationFilterValue } from '../types/filter.types'

// В справочнике тысячи населённых пунктов: показываем первые совпадения,
// остальные находятся по мере ввода. Рисовать весь справочник разом — это
// заметная задержка на слабых телефонах.
const MAX_VISIBLE_OPTIONS = 50

interface LocationFilterProps {
  value: LocationFilterValue
  onChange: (value: LocationFilterValue) => void
}

// Регион целиком или конкретный город/село одним полем с поиском — как
// LocationFilter сайта. Варианты — реальные места, где есть объявления
// (GET /ads/locations), а не справочник всей географии.
export function LocationFilter({ value, onChange }: LocationFilterProps) {
  const { locations, isPending } = useLocations()
  // null — пользователь ничего не печатал: в поле название выбранного места.
  const [text, setText] = useState<string | null>(null)
  const query = text ?? ''
  const selected = findLocationOption(locations, value)
  const hasValue = Boolean(value.regionIsoCode || value.localityFiasId)

  const items = useMemo(() => {
    const matches = createTextMatcher(query)

    return locations
      .filter(option => matches(option.label))
      .slice(0, MAX_VISIBLE_OPTIONS)
      .map(option => ({ key: getLocationOptionKey(option), label: option.label, option }))
  }, [locations, query])

  if (!isPending && !locations.length) return null

  const clear = () => {
    setText(null)
    onChange(CLEARED_LOCATION)
  }

  return (
    <View className='gap-2'>
      {hasValue && (
        <Pressable accessibilityRole='button' onPress={clear} className='self-start' hitSlop={8}>
          <Text className='text-xs text-gray-500'>Сбросить</Text>
        </Pressable>
      )}
      <Combobox
        text={text ?? selected?.label ?? ''}
        onChangeText={setText}
        items={items}
        onSelect={item => {
          setText(null)
          onChange(toLocationFilterValue(item.option))
        }}
        placeholder='Город, село, регион...'
        accessibilityLabel='Город, село, регион'
        emptyText='Ничего не найдено.'
        isLoading={isPending}
      />
    </View>
  )
}
