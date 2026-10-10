import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { Button } from '@/shared/components/button'
import { SelectField } from '@/shared/components/select-field'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { LocateFixed } from '@/shared/icons/lucide'

import { filtersApi } from '../api/filters.api'
import { useCurrentPosition } from '../hooks/use-current-position'
import { CLEARED_RADIUS, DEFAULT_RADIUS_KM } from '../lib/catalog-filters'
import type { RadiusFilterValue } from '../types/filter.types'
import { AddressInput, type PickedAddress } from './address-input'

const RADIUS_OPTIONS = ['10', '25', '50', '100', '200', '500'].map(km => ({ value: km, label: `${km} км` }))

const MY_LOCATION_LABEL = 'Моё местоположение'
// Так сервер (GeocodeService) отвечает, когда Яндекс не знает адреса точки.
// Это не подпись, а её отсутствие — оставляем «Моё местоположение».
const SERVER_ADDRESS_NOT_FOUND = 'Адрес не найден'

interface RadiusFilterProps {
  value: RadiusFilterValue
  onChange: (value: RadiusFilterValue) => void
}

// Поиск в радиусе от точки — как RadiusFilter сайта. Точка — либо
// местоположение телефона, либо адрес: ищут не только рядом с собой, но и
// рядом с местом доставки.
export function RadiusFilter({ value, onChange }: RadiusFilterProps) {
  const { locate, isLocating, error: locateError } = useCurrentPosition()
  const reverseGeocode = useMutation({
    mutationFn: ({ lat, lng }: { lat: number; lng: number }) => filtersApi.fetchAddressByCoords(lat, lng)
  })
  const [addressText, setAddressText] = useState(value.originLabel ?? '')
  const iconColor = useThemeColor('--color-foreground')
  const hasOrigin = Boolean(value.lat && value.lng)
  const radiusKm = value.radiusKm ?? DEFAULT_RADIUS_KM

  const setOrigin = ({ lat, lng, address }: PickedAddress) => {
    setAddressText(address)
    onChange({ lat: String(lat), lng: String(lng), radiusKm, originLabel: address })
  }

  const locateMe = async () => {
    const coords = await locate()
    if (!coords) return

    // Адрес нужен только для подписи: фильтр работает по координатам,
    // поэтому сбой геокодера не мешает включить поиск.
    let address = MY_LOCATION_LABEL

    try {
      const found = (await reverseGeocode.mutateAsync(coords)).trim()
      if (found && found !== SERVER_ADDRESS_NOT_FOUND) address = found
    } catch {
      // см. комментарий выше
    }

    setOrigin({ ...coords, address })
  }

  const clear = () => {
    setAddressText('')
    onChange(CLEARED_RADIUS)
  }

  return (
    <View className='gap-3'>
      <Button
        variant='outline'
        size='sm'
        title='Использовать моё местоположение'
        icon={<LocateFixed size={16} color={iconColor} />}
        isLoading={isLocating || reverseGeocode.isPending}
        onPress={() => void locateMe()}
      />

      {locateError && <Text className='text-xs text-red-600'>{locateError}</Text>}

      <AddressInput
        label='Или укажите адрес'
        text={addressText}
        onChangeText={text => {
          setAddressText(text)
          // Поле очистили — точки больше нет, как у сайта.
          if (!text && hasOrigin) onChange(CLEARED_RADIUS)
        }}
        onPick={setOrigin}
      />

      {hasOrigin && (
        <View className='flex-row items-center justify-between gap-2'>
          <View className='flex-row items-center gap-2'>
            <Text className='text-sm font-medium text-gray-900 dark:text-white'>Радиус</Text>
            <SelectField
              size='sm'
              value={radiusKm}
              options={RADIUS_OPTIONS}
              onChange={next => onChange({ ...value, radiusKm: next })}
              accessibilityLabel='Радиус'
            />
          </View>
          <Pressable accessibilityRole='button' onPress={clear} hitSlop={8}>
            <Text className='text-xs text-gray-500'>Сбросить</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}
