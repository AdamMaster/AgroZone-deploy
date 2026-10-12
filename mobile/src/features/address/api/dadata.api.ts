import { DADATA_API_KEY } from '@/config/env'

import { ApiError, NETWORK_ERROR_MESSAGE, TIMEOUT_ERROR_MESSAGE } from '@/lib/api/api-error'
import { createRequestSignal } from '@/lib/api/request-signal'

const SUGGEST_ADDRESS_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address'
// Столько же, сколько показывает react-dadata на сайте.
const SUGGESTIONS_COUNT = 10

interface DadataAddressSuggestion {
  value: string
  data: {
    geo_lat: string | null
    geo_lon: string | null
    region_with_type: string | null
    region_iso_code: string | null
    city_with_type: string | null
    settlement_with_type: string | null
    city_fias_id: string | null
    settlement_fias_id: string | null
  }
}

// Адрес с координатами и местом — поиск по радиусу берёт точку, объявление
// сохраняет ещё и регион с населённым пунктом (по ним работает фильтр
// каталога по месту, как у AddressInput сайта).
export interface AddressSuggestion {
  address: string
  // null — у DaData нет координат для этого варианта (например, улица без
  // дома в маленьком селе): от такой точки не посчитать расстояние.
  coords: { lat: number; lng: number } | null
  // ISO 3166-2:RU код региона — стабильный ключ фильтра, название — для показа.
  region?: string
  regionIsoCode?: string
  // Город, а если это не город — посёлок или село; ФИАС-код — ключ фильтра.
  locality?: string
  localityFiasId?: string
}

const parseCoordinate = (value: string | null) => {
  const parsed = value === null ? Number.NaN : Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : null
}

// Подсказки адресов DaData — тот же сервис, что AddressInput сайта.
// Запрос идёт напрямую в DaData, а не через наш HTTP-клиент: тот добавляет
// ключ сессии пользователя, а стороннему сервису его отдавать нельзя.
export async function suggestAddresses(query: string, signal?: AbortSignal): Promise<AddressSuggestion[]> {
  const requestSignal = createRequestSignal(signal)

  try {
    const response = await fetch(SUGGEST_ADDRESS_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Token ${DADATA_API_KEY}`
      },
      body: JSON.stringify({ query, count: SUGGESTIONS_COUNT }),
      signal: requestSignal.signal
    })

    if (!response.ok) {
      throw new ApiError(response.status, 'Не удалось загрузить подсказки адресов')
    }

    const { suggestions } = (await response.json()) as { suggestions: DadataAddressSuggestion[] }

    return suggestions.map(({ value, data }) => {
      const lat = parseCoordinate(data.geo_lat)
      const lng = parseCoordinate(data.geo_lon)

      return {
        address: value,
        coords: lat !== null && lng !== null ? { lat, lng } : null,
        region: data.region_with_type ?? undefined,
        regionIsoCode: data.region_iso_code ?? undefined,
        // Город и посёлок в DaData взаимоисключающие; приоритет — городу.
        locality: data.city_with_type ?? data.settlement_with_type ?? undefined,
        localityFiasId: data.city_fias_id ?? data.settlement_fias_id ?? undefined
      }
    })
  } catch (error) {
    if (signal?.aborted || error instanceof ApiError) throw error

    throw new ApiError(0, requestSignal.isTimedOut() ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE)
  } finally {
    requestSignal.cleanup()
  }
}
