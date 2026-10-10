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
  }
}

// Адрес с координатами — то, что нужно поиску по радиусу.
export interface AddressSuggestion {
  address: string
  // null — у DaData нет координат для этого варианта (например, улица без
  // дома в маленьком селе): искать от такой точки нельзя.
  coords: { lat: number; lng: number } | null
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

      return { address: value, coords: lat !== null && lng !== null ? { lat, lng } : null }
    })
  } catch (error) {
    if (signal?.aborted || error instanceof ApiError) throw error

    throw new ApiError(0, requestSignal.isTimedOut() ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE)
  } finally {
    requestSignal.cleanup()
  }
}
