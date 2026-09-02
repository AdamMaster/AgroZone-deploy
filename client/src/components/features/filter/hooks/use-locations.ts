'use client'

import { useQuery } from '@tanstack/react-query'

import { adsService } from '../../ads/services/ads.service'

// Список локаций почти не меняется в течение дня (пополняется только
// когда кто-то публикует объявление в новом месте), а дёргается фильтром
// гораздо чаще, чем форма объявления — DaData здесь вообще не участвует
// (эндпоинт просто читает то, что уже сохранено на самих объявлениях),
// но кэшируем всё равно подольше, чтобы не бить по бэкенду на каждое
// открытие фильтра.
export function useLocations() {
  const { data, isLoading } = useQuery({
    queryKey: ['ads-locations'],
    queryFn: () => adsService.findLocations(),
    staleTime: 5 * 60 * 1000
  })

  return { locations: data ?? [], isLoadingLocations: isLoading }
}
