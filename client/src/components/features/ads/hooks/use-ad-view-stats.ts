'use client'

import { useQuery } from '@tanstack/react-query'

import { adsService } from '../services'

// Отдельный ключ на каждую неделю (['ad-view-stats', adId, weekOffset]) —
// при переключении недели стрелочками react-query просто подгружает новый
// ключ, а старые недели остаются в кэше и подгружаются мгновенно при
// возврате назад.
export function useAdViewStats(adId: string, weekOffset: number) {
  const { data: stats, isLoading, isFetching } = useQuery({
    queryKey: ['ad-view-stats', adId, weekOffset],
    queryFn: () => adsService.getViewStats(adId, weekOffset),
    enabled: !!adId
  })

  return { stats, isLoading, isFetching }
}
