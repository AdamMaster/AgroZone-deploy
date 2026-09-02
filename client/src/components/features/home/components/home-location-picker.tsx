'use client'

import { useHomeLocationStore } from '@/store'
import { LocateFixed, MapPin } from 'lucide-react'
import { useState } from 'react'

import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui'

import { cn } from '@/lib/utils'

import { ILocationOption } from '../../ads/types/ad.types'
import { useLocations } from '../../filter/hooks/use-locations'

interface HomeLocationPickerProps {
  className?: string
}

export const HomeLocationPicker = ({ className }: HomeLocationPickerProps) => {
  const { locations } = useLocations()
  const { location, setLocation, clearLocation } = useHomeLocationStore()
  const [open, setOpen] = useState(false)

  const handleSelect = (option: ILocationOption) => {
    setLocation({
      regionIsoCode: option.type === 'region' ? option.regionIsoCode : undefined,
      localityFiasId: option.type === 'locality' ? option.localityFiasId : undefined,
      label: option.label
    })
    setOpen(false)
  }

  const handleShowAll = () => {
    clearLocation()
    setOpen(false)
  }

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors hover:bg-gray-50',
          className
        )}
      >
        <MapPin className='size-4' />
        {location.label ?? 'Россия'}
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        showCloseButton
        title='Выберите регион'
        description='Объявления на главной будут показаны для выбранной локации'
        className='w-[500px] max-w-full'
      >
        <CommandInput placeholder='Город, село, регион...' className='text-sm placeholder:text-gray-500' />
        <CommandList className='py-2'>
          <CommandEmpty>Ничего не найдено.</CommandEmpty>
          <CommandGroup>
            <CommandItem value='Россия' onSelect={handleShowAll} className='px-4 text-[15px] hover:bg-gray-100'>
              Россия
            </CommandItem>
            {locations.map(option => (
              <CommandItem
                key={option.type === 'locality' ? `l-${option.localityFiasId}` : `r-${option.regionIsoCode}`}
                value={option.label}
                onSelect={() => handleSelect(option)}
                className='px-4 py-2 text-[15px] hover:bg-gray-100'
              >
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
