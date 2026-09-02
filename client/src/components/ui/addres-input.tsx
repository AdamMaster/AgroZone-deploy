'use client'

import React from 'react'
import { AddressSuggestions, DaDataAddress, DaDataSuggestion } from 'react-dadata'

import { FieldError } from './field'

import 'react-dadata/dist/react-dadata.css'

interface AddressValue {
  address: string
  lat: number
  lng: number
  // Из того же DaData-ответа, что и адрес/координаты — регион для
  // фильтра каталога по местоположению (см. AdsService.getAvailableRegions
  // и AdsService.findAll на бэкенде). regionIsoCode — ISO 3166-2:RU код,
  // стабильный ключ для фильтрации; region — человекочитаемое название для
  // отображения.
  region?: string
  regionIsoCode?: string
  // Более узкий уровень, чем регион — конкретный город ИЛИ (если это не
  // город, а посёлок/село) населённый пункт. locality — для отображения,
  // localityFiasId — стабильный ФИАС-идентификатор для точного фильтра.
  locality?: string
  localityFiasId?: string
}

interface AddressInputProps {
  value: string
  error?: string
  label?: string
  placeholder?: string
  className?: string
  onChange: (data: AddressValue) => void
}

export const AddressInput: React.FC<AddressInputProps> = ({
  value,
  error,
  label = 'Местоположение',
  placeholder = 'Начните вводить адрес (например: г. Чехов, ул. Ленина...)',
  onChange
}) => {
  const token = process.env.NEXT_PUBLIC_DADATA_KEY || ''

  const handleAddressChange = (suggestion: DaDataSuggestion<DaDataAddress> | undefined) => {
    if (!suggestion) {
      onChange({
        address: '',
        lat: 0,
        lng: 0,
        region: undefined,
        regionIsoCode: undefined,
        locality: undefined,
        localityFiasId: undefined
      })
      return
    }

    const lat = suggestion.data.geo_lat ? parseFloat(suggestion.data.geo_lat) : 0
    const lng = suggestion.data.geo_lon ? parseFloat(suggestion.data.geo_lon) : 0

    // city и settlement — взаимоисключающие уровни адресной иерархии
    // DaData (город ИЛИ, если это не город, посёлок/село), приоритет
    // отдаём city.
    const locality = suggestion.data.city_with_type ?? suggestion.data.settlement_with_type ?? undefined
    const localityFiasId = suggestion.data.city_fias_id ?? suggestion.data.settlement_fias_id ?? undefined

    onChange({
      address: suggestion.value,
      lat,
      lng,
      region: suggestion.data.region_with_type ?? undefined,
      regionIsoCode: suggestion.data.region_iso_code ?? undefined,
      locality,
      localityFiasId
    })
  }

  const currentValue = value ? ({ value } as DaDataSuggestion<DaDataAddress>) : undefined

  return (
    <div className='flex w-full flex-col gap-1.5'>
      {label && <label className='text-sm font-medium text-gray-700 dark:text-gray-300'>{label}</label>}

      <div className={error ? '[&_input]:border-red-500' : ''}>
        <AddressSuggestions
          token={token}
          value={currentValue}
          inputProps={{
            className:
              'file:text-foreground disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-gray-50 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 md:h-13 sm:h-12 h-11 w-full min-w-0 rounded-lg border bg-gray-50 px-4 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 hover:bg-gray-100 focus-visible:border-[#5da500] focus-visible:bg-white focus-visible:outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm',
            placeholder
          }}
          onChange={handleAddressChange}
        />
      </div>

      {error && <FieldError className='relative mt-1.5'>{error}</FieldError>}
    </div>
  )
}
