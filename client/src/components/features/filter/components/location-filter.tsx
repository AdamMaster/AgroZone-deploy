'use client'

import { CommandItem } from 'cmdk'
import { useEffect, useState } from 'react'

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList, Label } from '@/components/ui'

import { cn } from '@/lib/utils'

import { ILocationOption } from '../../ads/types/ad.types'
import { useLocations } from '../hooks/use-locations'

export interface LocationFilterValue {
  regionIsoCode?: string
  localityFiasId?: string
}

interface LocationFilterProps {
  value: LocationFilterValue
  onChange: (value: LocationFilterValue) => void
}

// Фильтр по локации любой степени конкретности — одним полем поиска, от
// целого региона (область/республика/край) до конкретного города или
// села. Список — НЕ хардкод географии РФ (см. обсуждение с
// пользователем: это и политически спорно на некоторых границах, и
// быстро расходится с реальностью), а реальные локации, где прямо сейчас
// есть хотя бы одно опубликованное объявление
// (AdsService.getAvailableLocations):
//  - записи уровня 'region' — выбор возвращает ВСЕ объявления по всему
//    региону (город + все сёла в нём), как в примере "вся
//    Кабардино-Балкарская республика";
//  - записи уровня 'locality' (город/село) — точечный фильтр по
//    конкретному населённому пункту, через стабильный ФИАС-id, а не
//    сравнение строк.
// regionIsoCode и localityFiasId в состоянии фильтра — взаимоисключающие:
// выбор одного всегда сбрасывает другой.
export const LocationFilter = ({ value, onChange }: LocationFilterProps) => {
  const { locations, isLoadingLocations } = useLocations()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!value.regionIsoCode && !value.localityFiasId) {
      setSearch('')
      return
    }

    const selected = locations.find(option =>
      value.localityFiasId
        ? option.type === 'locality' && option.localityFiasId === value.localityFiasId
        : option.type === 'region' && option.regionIsoCode === value.regionIsoCode
    )

    if (selected) setSearch(selected.label)
  }, [value, locations])

  if (!isLoadingLocations && !locations.length) return null

  const handleSelect = (option: ILocationOption) => {
    setSearch(option.label)
    setOpen(false)

    onChange(
      option.type === 'locality'
        ? { regionIsoCode: undefined, localityFiasId: option.localityFiasId }
        : { regionIsoCode: option.regionIsoCode, localityFiasId: undefined }
    )
  }

  const handleClear = () => {
    setSearch('')
    onChange({ regionIsoCode: undefined, localityFiasId: undefined })
  }

  const hasValue = Boolean(value.regionIsoCode || value.localityFiasId)

  return (
    <div className='flex h-auto flex-col gap-2'>
      <div className='flex items-center justify-between'>
        <Label>Локация</Label>
        {hasValue && (
          <button type='button' onClick={handleClear} className='text-secondary text-xs hover:underline'>
            Сбросить
          </button>
        )}
      </div>
      <Command className={cn('overflow-initial relative h-[46px] rounded-lg border', open ? 'focus-input' : 'border')}>
        <CommandInput
          className='h-full p-0 placeholder:text-gray-500'
          placeholder='Город, село, регион...'
          value={search}
          onValueChange={setSearch}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {open && (
          <div className='absolute top-[calc(100%+10px)] left-0 z-10 w-full overflow-hidden rounded-lg border bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:bg-[#212121]'>
            <CommandList className='rounded-0 py-2'>
              <CommandEmpty>Ничего не найдено.</CommandEmpty>
              <CommandGroup>
                {locations.map(option => (
                  <CommandItem
                    className='flex cursor-pointer items-center gap-2 px-3.5 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800'
                    key={option.type === 'locality' ? `l-${option.localityFiasId}` : `r-${option.regionIsoCode}`}
                    value={option.label}
                    onSelect={() => handleSelect(option)}
                  >
                    <span>{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  )
}
