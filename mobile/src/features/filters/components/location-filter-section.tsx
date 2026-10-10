import { useState } from 'react'
import { View } from 'react-native'

import { LineTabs } from '@/shared/components/line-tabs'

import { CLEARED_LOCATION, CLEARED_RADIUS, hasOrigin } from '../lib/catalog-filters'
import type { LocationFilterValue, RadiusFilterValue } from '../types/filter.types'
import { LocationFilter } from './location-filter'
import { RadiusFilter } from './radius-filter'

type LocationMode = 'region' | 'radius'

const TABS = [
  { value: 'region', label: 'Регион / город' },
  { value: 'radius', label: 'Рядом со мной' }
] as const satisfies readonly { value: LocationMode; label: string }[]

type LocationSectionValue = LocationFilterValue & RadiusFilterValue

interface LocationFilterSectionProps {
  value: LocationSectionValue
  onChange: (value: LocationSectionValue) => void
}

// Два способа задать место — как LocationFilterSection сайта: регион/город
// или радиус от точки. Выбор одного сбрасывает другой, чтобы не путать
// двумя критериями сразу.
export function LocationFilterSection({ value, onChange }: LocationFilterSectionProps) {
  const [mode, setMode] = useState<LocationMode>(hasOrigin(value) ? 'radius' : 'region')

  return (
    <View className='gap-2'>
      <LineTabs value={mode} tabs={TABS} onChange={setMode} />

      <View className='pt-2'>
        {mode === 'region' ? (
          <LocationFilter
            value={{ regionIsoCode: value.regionIsoCode, localityFiasId: value.localityFiasId }}
            onChange={location => onChange({ ...location, ...CLEARED_RADIUS })}
          />
        ) : (
          <RadiusFilter
            value={{ lat: value.lat, lng: value.lng, radiusKm: value.radiusKm, originLabel: value.originLabel }}
            onChange={radius => onChange({ ...radius, ...CLEARED_LOCATION })}
          />
        )}
      </View>
    </View>
  )
}
