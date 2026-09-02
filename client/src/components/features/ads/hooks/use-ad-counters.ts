'use client'

import { useQuery } from '@tanstack/react-query'

import { adsService } from '../services'

// Компактные счётчики (просмотры всего/сегодня, избранное) для панели над
// фото на странице объявления владельца — отдельно от useAdViewStats (та
// тянет тяжёлый недельный график для отдельной страницы статистики).
export function useAdCounters(adId: string) {
  const { data: counters, isLoading } = useQuery({
    queryKey: ['ad-counters', adId],
    queryFn: () => adsService.getCounters(adId),
    enabled: !!adId
  })

  return { counters, isLoading }
}
