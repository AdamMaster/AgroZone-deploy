import { apiClient } from '@/lib/api/api-client'

import type { LocationOption } from '../types/filter.types'

export const filtersApi = {
  fetchLocations: (signal?: AbortSignal) => apiClient.get<LocationOption[]>('/ads/locations', { signal }),

  // Адрес по координатам (Яндекс-геокодер на сервере) — только для подписи
  // точки поиска. Параметр долготы у сервера называется lon.
  fetchAddressByCoords: (lat: number, lng: number) =>
    apiClient.get<string>('/ads/geocode', { params: { lat, lon: lng }, responseType: 'text' })
}
