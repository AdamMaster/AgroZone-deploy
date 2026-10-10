import { apiClient } from '@/lib/api/api-client'

import type { AdStatus, MyAd, MyAdsStatusCounts } from '../types/my-ad.types'

export const myAdsApi = {
  // Свои объявления в указанных статусах, новые сверху, постранично.
  fetchMyAds: ({
    statuses,
    page,
    limit,
    signal
  }: {
    statuses: readonly AdStatus[]
    page: number
    limit: number
    signal?: AbortSignal
  }) => apiClient.get<MyAd[]>('/ads/my', { params: { status: statuses, page, limit }, signal }),

  fetchStatusCounts: (signal?: AbortSignal) => apiClient.get<MyAdsStatusCounts>('/ads/my/status-counts', { signal })
}
