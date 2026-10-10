import { apiClient } from '@/lib/api/api-client'

import type { AdCounters, AdDetail, AdReportReason, AdViewStats } from '../types/ad-detail.types'
import type { AdsListResponse } from '../types/ad.types'

const path = (id: string) => `/ads/${encodeURIComponent(id)}`
const ownerPath = (id: string) => `/ads/my/${encodeURIComponent(id)}`

// Сколько похожих объявлений показывать под объявлением — как на сайте.
const SIMILAR_ADS_LIMIT = 8

export const adDetailApi = {
  // trackView — настоящий просмотр человеком: сервер учтёт его в
  // статистике продавца (повторные просмотры одного зрителя склеивает).
  fetchPublic: (id: string, signal?: AbortSignal) =>
    apiClient.get<AdDetail>(path(id), { params: { trackView: true }, signal }),

  fetchForOwner: (id: string, signal?: AbortSignal) => apiClient.get<AdDetail>(ownerPath(id), { signal }),

  fetchSimilar: (ad: Pick<AdDetail, 'id' | 'categoryId'>, signal?: AbortSignal) =>
    apiClient.get<AdsListResponse>('/ads', {
      params: { categoryId: ad.categoryId, excludeAdId: ad.id, limit: SIMILAR_ADS_LIMIT },
      signal
    }),

  fetchPhone: (id: string) => apiClient.get<{ phone: string }>(`${path(id)}/phone`),

  fetchCounters: (id: string, signal?: AbortSignal) =>
    apiClient.get<AdCounters>(`${ownerPath(id)}/counters`, { signal }),

  fetchViewStats: (id: string, weekOffset: number, signal?: AbortSignal) =>
    apiClient.get<AdViewStats>(`${ownerPath(id)}/views`, { params: { weekOffset }, signal }),

  report: (id: string, reason: AdReportReason, comment?: string) =>
    apiClient.post<unknown>(`${path(id)}/reports`, { reason, comment }, { expectBody: false }),

  // Смена статуса владельцем. Ответ не читаем: после действия объявление и
  // списки перезапрашиваются целиком.
  archive: (id: string) => apiClient.patch<unknown>(`${path(id)}/archive`, undefined, { expectBody: false }),
  activate: (id: string) => apiClient.patch<unknown>(`${path(id)}/activate`, undefined, { expectBody: false }),
  draft: (id: string) => apiClient.patch<unknown>(`${path(id)}/draft`, undefined, { expectBody: false }),
  republish: (id: string) => apiClient.patch<unknown>(`${path(id)}/republish`, undefined, { expectBody: false }),
  remove: (id: string) => apiClient.delete<unknown>(path(id), { expectBody: false })
}
