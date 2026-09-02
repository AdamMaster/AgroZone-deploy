'use client'

import { load } from '@2gis/mapgl'
import { useEffect, useRef, useState } from 'react'

import { Command, CommandGroup, CommandInput, CommandItem, CommandList, FieldError, Label } from '@/components/ui'

type MapGLApi = Awaited<ReturnType<typeof load>>
type MapGLMap = InstanceType<MapGLApi['Map']>
type MapGLMarker = InstanceType<MapGLApi['Marker']>

interface MapAdValue {
  lat: number | null
  lng: number | null
  address: string
}

interface MapAdProps {
  value: MapAdValue
  error?: string
  onChange: (value: MapAdValue) => void
}

interface AddressSuggestion {
  id: string
  full_name: string
  address_name?: string

  point?: {
    lat: number
    lon: number
  }

  adm_div?: {
    id: string
    name: string
    type: string
  }[]
}

type AddressFormatterItem = {
  address_name?: string
  name?: string
  full_name?: string
  adm_div?: {
    name: string
    type: string
  }[]
}

interface MapClickEvent {
  lngLat: number[]
}

export function MapAd({ value, error, onChange }: MapAdProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapGLMap | null>(null)
  const markerRef = useRef<MapGLMarker | null>(null)
  const apiRef = useRef<MapGLApi | null>(null)

  const [query, setQuery] = useState(value.address || '')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    let destroyed = false

    const init = async () => {
      const api = await load()

      if (destroyed || !containerRef.current) return

      apiRef.current = api

      const map = new api.Map(containerRef.current, {
        center: [37.62, 55.75],
        zoom: 13,
        key: process.env.NEXT_PUBLIC_2GIS_KEY!
      })

      mapRef.current = map

      map.on('click', async (e: MapClickEvent) => {
        try {
          const [lng, lat] = e.lngLat

          markerRef.current?.destroy()

          markerRef.current = new api.Marker(map, {
            coordinates: [lng, lat]
          })

          const res = await fetch(
            `https://catalog.api.2gis.com/3.0/items/geocode?lat=${lat}&lon=${lng}&fields=items.adm_div&key=${process.env.NEXT_PUBLIC_2GIS_KEY}`
          )

          const data = await res.json()

          const item = data.result?.items?.[0]

          if (!item) {
            onChange({
              lat,
              lng,
              address: ''
            })

            setQuery('')
            return
          }

          const address = formatAddress(item)

          onChange({
            lat,
            lng,
            address
          })

          setQuery(address)
        } catch (error) {
          console.error(error)
        }
      })

      if (value.lat && value.lng) {
        map.setCenter([value.lng, value.lat])
        map.setZoom(15)

        markerRef.current?.destroy()

        markerRef.current = new api.Marker(map, {
          coordinates: [value.lng, value.lat]
        })
      } else {
        navigator.geolocation?.getCurrentPosition(pos => {
          const { latitude, longitude } = pos.coords

          map.setCenter([longitude, latitude])
          map.setZoom(15)

          markerRef.current?.destroy()

          markerRef.current = new api.Marker(map, {
            coordinates: [longitude, latitude]
          })
        })
      }
    }

    init()

    return () => {
      destroyed = true

      markerRef.current?.destroy()
      mapRef.current?.destroy()

      markerRef.current = null
      mapRef.current = null
      apiRef.current = null
    }
  }, [])

  useEffect(() => {
    if (query.trim().length < 3) return

    const timeout = setTimeout(async () => {
      try {
        setIsLoading(true)

        const res = await fetch(
          `https://catalog.api.2gis.com/3.0/items?q=${encodeURIComponent(
            query
          )}&fields=items.point,items.adm_div&key=${process.env.NEXT_PUBLIC_2GIS_KEY}`
        )

        const data = await res.json()

        setSuggestions((data.result?.items ?? []).filter((item: AddressSuggestion) => item.point))
      } catch (error) {
        console.error(error)
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
    }, 400)

    return () => clearTimeout(timeout)
  }, [query])

  const handleSelect = (item: AddressSuggestion) => {
    if (!item.point || !mapRef.current || !apiRef.current) return

    const { lat, lon } = item.point

    mapRef.current.setCenter([lon, lat])
    mapRef.current.setZoom(17)

    markerRef.current?.destroy()

    markerRef.current = new apiRef.current.Marker(mapRef.current, {
      coordinates: [lon, lat]
    })

    const address = formatAddress(item)

    onChange({
      lat,
      lng: lon,
      address
    })

    setQuery(address)
    setSuggestions([])
    setIsOpen(false)
  }

  return (
    <div className='space-y-2'>
      <Label>Выберите местоположение</Label>

      <Command shouldFilter={false} className='rounded-lg border'>
        <CommandInput
          value={query}
          placeholder='Введите адрес...'
          onValueChange={value => {
            setQuery(value)
            setIsOpen(true)

            if (value.trim().length < 3) {
              setSuggestions([])
            }

            if (value.length === 0) {
              onChange({
                lat: null,
                lng: null,
                address: ''
              })
            }
          }}
        />

        {isOpen && query.trim().length >= 3 && (
          <CommandList>
            {isLoading && <div className='text-muted-foreground p-3 text-sm'>Поиск...</div>}

            {!isLoading && suggestions.length === 0 && (
              <div className='text-muted-foreground p-3 text-sm'>Ничего не найдено</div>
            )}

            <CommandGroup>
              {suggestions.map(item => (
                <CommandItem key={item.id} value={item.full_name} onSelect={() => handleSelect(item)}>
                  {item.full_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        )}
      </Command>
      {error && <FieldError className='relative mt-1.5'>{error}</FieldError>}
      <div ref={containerRef} className='h-[400px] w-full overflow-hidden rounded-lg border' />
    </div>
  )
}

function formatAddress(item: AddressFormatterItem) {
  const region = item.adm_div?.find(d => d.type === 'region')?.name ?? ''
  const city = item.adm_div?.find(d => d.type === 'city')?.name ?? ''
  const address = item.address_name || item.name || item.full_name || ''

  return [region, city, address].filter(Boolean).join(', ')
}
