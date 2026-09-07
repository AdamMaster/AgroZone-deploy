'use client'

import { useState } from 'react'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'

import { LocationFilter, LocationFilterValue } from './location-filter'
import { RadiusFilter, RadiusFilterValue } from './radius-filter'

export type LocationFilterSectionValue = LocationFilterValue & RadiusFilterValue

interface LocationFilterSectionProps {
  value: LocationFilterSectionValue
  onChange: (patch: Partial<LocationFilterSectionValue>) => void
}

type LocationMode = 'region' | 'radius'

// Два взаимоисключающих способа задать местоположение в фильтре каталога
// (F3): "Регион / город" (LocationFilter — точное совпадение по
// справочнику реальных локаций) и "Рядом с адресом" (RadiusFilter — все
// объявления в радиусе N км от точки). Взаимоисключимость — только в UI:
// выбор одного всегда сбрасывает значение другого, чтобы не путать
// пользователя одновременно двумя разными критериями местоположения.
// Бэкенд (AdsService.findAll) ничего об этом не знает и просто ANDit оба
// условия, если они вдруг придут вместе — тот же принцип, что уже
// применён к regionIsoCode/localityFiasId внутри самого LocationFilter.
export const LocationFilterSection = ({ value, onChange }: LocationFilterSectionProps) => {
  const hasRegion = Boolean(value.regionIsoCode || value.localityFiasId)
  const hasRadius = Boolean(value.lat && value.lng)

  const [activeTab, setActiveTab] = useState<LocationMode>(hasRadius ? 'radius' : 'region')

  // Синхронизация при сбросе фильтра ИЗВНЕ (кнопка "Сбросить всё" в
  // Filter, чип в ActiveFilterChips, кнопка "Назад" браузера) — иначе
  // вкладка "Рядом с адресом" осталась бы открытой и пустой после того,
  // как её фильтр уже сбросили не через саму вкладку. Сравнение прямо в
  // теле рендера, а не в useEffect — тот же приём, что и у
  // PriceRangeFilter в filter.tsx (см. комментарий там): правило
  // react-hooks/set-state-in-effect в проекте включено и не пропускает
  // setState внутри эффекта.
  const externalKey = `${hasRegion}|${hasRadius}`
  const [prevExternalKey, setPrevExternalKey] = useState(externalKey)
  if (externalKey !== prevExternalKey) {
    setPrevExternalKey(externalKey)
    if (hasRadius) setActiveTab('radius')
    else if (hasRegion) setActiveTab('region')
  }

  return (
    <div className='flex flex-col gap-3'>
      <Tabs value={activeTab} onValueChange={val => setActiveTab((val as LocationMode) ?? 'region')}>
        <TabsList variant='line' className='h-7 gap-4'>
          <TabsTrigger value='region' className='h-7 p-0'>
            Регион / город
          </TabsTrigger>
          <TabsTrigger value='radius' className='h-7 p-0'>
            Рядом со мной
          </TabsTrigger>
        </TabsList>

        <TabsContent value='region'>
          <LocationFilter
            value={{ regionIsoCode: value.regionIsoCode, localityFiasId: value.localityFiasId }}
            onChange={patch =>
              onChange({ ...patch, lat: undefined, lng: undefined, radiusKm: undefined, originLabel: undefined })
            }
          />
        </TabsContent>

        <TabsContent value='radius'>
          <RadiusFilter
            value={{ lat: value.lat, lng: value.lng, radiusKm: value.radiusKm, originLabel: value.originLabel }}
            onChange={patch => onChange({ ...patch, regionIsoCode: undefined, localityFiasId: undefined })}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
