import { useQuery } from '@tanstack/react-query'

import { filtersApi } from '../api/filters.api'
import type { LocationOption } from '../types/filter.types'

const EMPTY_LOCATIONS: readonly LocationOption[] = []

// Список пополняется, только когда кто-то публикует объявление в новом
// месте, — держим подольше, как сайт (5 минут).
const LOCATIONS_STALE_TIME = 5 * 60_000

// enabled: false — список сейчас не нужен (например, в каталоге не выбран
// регион и подписывать чип нечем).
export function useLocations({ enabled = true }: { enabled?: boolean } = {}) {
  const { data, isPending } = useQuery({
    queryKey: ['ads', 'locations'],
    queryFn: ({ signal }) => filtersApi.fetchLocations(signal),
    staleTime: LOCATIONS_STALE_TIME,
    enabled
  })

  return { locations: data ?? EMPTY_LOCATIONS, isPending }
}
