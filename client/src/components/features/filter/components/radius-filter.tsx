'use client'

import { Loader2, LocateFixed } from 'lucide-react'
import { useState } from 'react'

import {
  AddressInput,
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui'

import { useGeolocation } from '../../ads/hooks/use-geolocation'
import { useReverseGeocode } from '../../ads/hooks/use-reverse-geocode'

export interface RadiusFilterValue {
  lat?: string
  lng?: string
  radiusKm?: string
  originLabel?: string
}

interface RadiusFilterProps {
  value: RadiusFilterValue
  onChange: (value: RadiusFilterValue) => void
}

const DEFAULT_RADIUS_KM = '50'
const RADIUS_OPTIONS_KM = ['10', '25', '50', '100', '200', '500']

// Радиус-поиск (F3) — альтернатива LocationFilter (регион/город целиком):
// точка задаётся ЛИБО геолокацией браузера, ЛИБО вручную через AddressInput
// (тот же компонент, что и на форме размещения объявления — см.
// ad-form.tsx). Оба способа, а не один — по решению с владельцем: "рядом
// со мной" не подходит на десктопе без доступа к геолокации и не подходит,
// когда ищут рядом не с собой, а с точкой доставки техники.
export const RadiusFilter = ({ value, onChange }: RadiusFilterProps) => {
  const { locate, isLocating, error: geolocationError } = useGeolocation()
  const { reverseGeocode } = useReverseGeocode()
  const [addressInputValue, setAddressInputValue] = useState(value.originLabel ?? '')

  const hasOrigin = Boolean(value.lat && value.lng)

  const handleUseMyLocation = async () => {
    const coords = await locate()

    if (!coords) return

    // Реверс-геокодинг — только ради читаемой подписи (поле ввода/чип),
    // сам фильтр уже работает по координатам без него. Поэтому неудача
    // здесь не блокирует включение фильтра — просто остаёмся с общей
    // подписью вместо адреса.
    let label = 'Моё местоположение'

    try {
      label = await reverseGeocode({ lat: coords.lat, lng: coords.lng })
    } catch {
      // См. комментарий выше.
    }

    setAddressInputValue(label)
    onChange({
      lat: String(coords.lat),
      lng: String(coords.lng),
      radiusKm: value.radiusKm ?? DEFAULT_RADIUS_KM,
      originLabel: label
    })
  }

  const handleAddressChange = (geoData: { address: string; lat: number; lng: number }) => {
    setAddressInputValue(geoData.address)

    // AddressInput отдаёт address: '', lat: 0, lng: 0 при очистке поля
    // (см. AddressInput.handleAddressChange) — это и есть сигнал "точку
    // сбросили", а не координаты 0°/0° где-то в Гвинейском заливе.
    if (!geoData.address) {
      onChange({ lat: undefined, lng: undefined, radiusKm: undefined, originLabel: undefined })
      return
    }

    onChange({
      lat: String(geoData.lat),
      lng: String(geoData.lng),
      radiusKm: value.radiusKm ?? DEFAULT_RADIUS_KM,
      originLabel: geoData.address
    })
  }

  const handleClear = () => {
    setAddressInputValue('')
    onChange({ lat: undefined, lng: undefined, radiusKm: undefined, originLabel: undefined })
  }

  return (
    <div className='flex flex-col gap-3'>
      <Button
        type='button'
        variant='outline'
        className='w-full justify-center gap-2'
        disabled={isLocating}
        onClick={handleUseMyLocation}
      >
        {isLocating ? <Loader2 className='size-4 animate-spin' /> : <LocateFixed className='size-4' />}
        Использовать моё местоположение
      </Button>

      {geolocationError && <p className='text-xs text-red-600'>{geolocationError}</p>}

      <AddressInput
        value={addressInputValue}
        label='Или укажите адрес'
        placeholder='Город, село, регион...'
        onChange={handleAddressChange}
      />

      {hasOrigin && (
        <div className='flex items-center justify-between gap-2'>
          <div className='flex items-center gap-2'>
            <Label className='shrink-0 text-sm'>Радиус</Label>
            <Select
              value={value.radiusKm ?? DEFAULT_RADIUS_KM}
              onValueChange={(val: string | null) => onChange({ ...value, radiusKm: val ?? DEFAULT_RADIUS_KM })}
            >
              <SelectTrigger className='h-9! px-3'>
                <SelectValue>{(v: string | null) => `${v ?? DEFAULT_RADIUS_KM} км`}</SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} align='start'>
                {RADIUS_OPTIONS_KM.map(km => (
                  <SelectItem key={km} value={km} className='rounded-none px-4'>
                    {km} км
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button type='button' onClick={handleClear} className='text-secondary text-xs hover:underline'>
            Сбросить
          </button>
        </div>
      )}
    </div>
  )
}
