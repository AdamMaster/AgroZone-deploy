'use client'

import { useQuery } from '@tanstack/react-query'

import { adsService } from '../services/ads.service'
import { IAdsListResponse } from '../types/ad.types'

// initialData — первая страница, уже отрисованная сервером (см.
// AdsClient/HomeAdsFeed на главной, S6 в ROADMAP.md). Передаётся только
// когда вызывающий код уверен, что это данные ИМЕННО под текущий params
// (см. canUseInitialAds в ads-client.tsx) — React Query не проверяет это
// сам, а просто отдаёт initialData как есть при первом рендере.
export function useAds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  params?: Record<string, any>,
  initialData?: IAdsListResponse
) {
  const { data, isLoading } = useQuery({
    queryKey: ['ads', params ?? {}],
    queryFn: () => adsService.findAll(params),
    initialData
  })

  return { ads: data?.items ?? [], total: data?.total ?? 0, isLoadingAds: isLoading }
}
