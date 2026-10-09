import { apiClient } from '@/lib/api/api-client'

import type { AdsListResponse } from '../types/ad.types'

interface FetchAdsParams {
  page: number
  limit: number
  signal?: AbortSignal
}

export const adsApi = {
  // Без фильтров и sortBy сервер отдаёт опубликованные объявления в порядке
  // DATE_DESC с учётом поднятий — ровно та лента, что на главной сайта.
  fetchAds: ({ page, limit, signal }: FetchAdsParams) =>
    apiClient.get<AdsListResponse>('/ads', { params: { page, limit }, signal })
}
