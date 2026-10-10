import { apiClient } from '@/lib/api/api-client'

import type { AdsFilters, AdsListResponse, FavoriteAd } from '../types/ad.types'

interface PageParams {
  page: number
  limit: number
  signal?: AbortSignal
}

export const adsApi = {
  // Без условий сервер отдаёт опубликованные объявления в порядке
  // DATE_DESC с учётом поднятий — ровно та лента, что на главной сайта.
  fetchAds: ({ page, limit, signal, filters }: PageParams & { filters: AdsFilters }) =>
    apiClient.get<AdsListResponse>('/ads', { params: { page, limit, ...filters }, signal }),

  fetchFavorites: ({ page, limit, signal }: PageParams) =>
    apiClient.get<FavoriteAd[]>('/ads/me/favorites', { params: { page, limit }, signal }),

  addFavorite: (adId: string) => apiClient.post<unknown>(`/ads/${adId}/favorite`, undefined, { expectBody: false }),

  removeFavorite: (adId: string) => apiClient.delete<unknown>(`/ads/${adId}/favorite`, { expectBody: false })
}
