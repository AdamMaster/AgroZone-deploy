import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'

import { Combobox } from '@/shared/components/combobox'

import type { AddressSuggestion } from '../api/dadata.api'
import { useAddressSuggestions } from '../hooks/use-address-suggestions'

// Выбранный адрес — всегда с координатами.
export interface PickedAddress extends Omit<AddressSuggestion, 'coords'> {
  lat: number
  lng: number
}

interface AddressInputProps {
  label: string
  text: string
  onChangeText: (text: string) => void
  onPick: (address: PickedAddress) => void
  placeholder?: string
  // Ошибка формы (например, «Укажите адрес»); своя — про адрес без
  // координат — показывается вместо неё.
  error?: string
}

const NO_COORDS_MESSAGE = 'Для этого адреса не нашлось координат — выберите более точный вариант'

// Адрес с подсказками DaData — как AddressInput сайта (react-dadata):
// выбранная подсказка даёт координаты точки, регион и населённый пункт.
export function AddressInput({
  label,
  text,
  onChangeText,
  onPick,
  placeholder = 'Город, село, регион...',
  error
}: AddressInputProps) {
  const { suggestions, isLoading } = useAddressSuggestions(text)
  const [coordsError, setCoordsError] = useState<string | null>(null)

  const items = useMemo(
    () =>
      suggestions.map((suggestion, index) => ({
        key: `${index}-${suggestion.address}`,
        label: suggestion.address,
        suggestion
      })),
    [suggestions]
  )

  const pick = ({ coords, ...suggestion }: AddressSuggestion) => {
    onChangeText(suggestion.address)

    // Без координат нет точки: ни расстояния от неё, ни места объявления
    // на карте — лучше сказать об этом сразу.
    if (!coords) {
      setCoordsError(NO_COORDS_MESSAGE)
      return
    }

    setCoordsError(null)
    onPick({ ...suggestion, ...coords })
  }

  const shownError = coordsError ?? error

  return (
    <View className='gap-1.5'>
      <Text className='text-sm font-medium text-gray-950 dark:text-gray-300'>{label}</Text>
      <Combobox
        text={text}
        onChangeText={next => {
          setCoordsError(null)
          onChangeText(next)
        }}
        items={items}
        onSelect={item => pick(item.suggestion)}
        placeholder={placeholder}
        accessibilityLabel={label}
        emptyText={text.trim().length < 3 ? 'Начните вводить адрес' : 'Ничего не найдено.'}
        isLoading={isLoading}
      />
      {shownError && <Text className='text-xs text-red-600'>{shownError}</Text>}
    </View>
  )
}
