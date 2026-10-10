import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'

import { Combobox } from '@/shared/components/combobox'

import type { AddressSuggestion } from '../api/dadata.api'
import { useAddressSuggestions } from '../hooks/use-address-suggestions'
import type { Coords } from '../hooks/use-current-position'

export interface PickedAddress extends Coords {
  address: string
}

interface AddressInputProps {
  label: string
  text: string
  onChangeText: (text: string) => void
  onPick: (address: PickedAddress) => void
}

const NO_COORDS_MESSAGE = 'Для этого адреса не нашлось координат — выберите более точный вариант'

// Адрес с подсказками DaData — как AddressInput сайта (react-dadata).
// Выбранная подсказка даёт координаты точки.
export function AddressInput({ label, text, onChangeText, onPick }: AddressInputProps) {
  const { suggestions, isLoading } = useAddressSuggestions(text)
  const [error, setError] = useState<string | null>(null)

  const items = useMemo(
    () =>
      suggestions.map((suggestion, index) => ({
        key: `${index}-${suggestion.address}`,
        label: suggestion.address,
        suggestion
      })),
    [suggestions]
  )

  const pick = ({ address, coords }: AddressSuggestion) => {
    onChangeText(address)

    // Без координат от точки не посчитать расстояние; лучше сказать об
    // этом, чем искать «рядом» с нулевой точкой в океане.
    if (!coords) {
      setError(NO_COORDS_MESSAGE)
      return
    }

    setError(null)
    onPick({ address, ...coords })
  }

  return (
    <View className='gap-1.5'>
      <Text className='text-sm font-medium text-gray-950 dark:text-gray-300'>{label}</Text>
      <Combobox
        text={text}
        onChangeText={next => {
          setError(null)
          onChangeText(next)
        }}
        items={items}
        onSelect={item => pick(item.suggestion)}
        placeholder='Город, село, регион...'
        accessibilityLabel={label}
        emptyText={text.trim().length < 3 ? 'Начните вводить адрес' : 'Ничего не найдено.'}
        isLoading={isLoading}
      />
      {error && <Text className='text-xs text-red-600'>{error}</Text>}
    </View>
  )
}
