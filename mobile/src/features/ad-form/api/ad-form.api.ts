import { apiClient } from '@/lib/api/api-client'

import type { EditableAd } from '../types/ad-form.types'

// Объявление с фото по мобильной сети грузится дольше обычных 15 секунд.
const AD_UPLOAD_TIMEOUT_MS = 180_000

export const adFormApi = {
  fetchForEdit: (id: string, signal?: AbortSignal) =>
    apiClient.get<EditableAd>(`/ads/my/${encodeURIComponent(id)}`, { signal }),

  // Новое объявление уходит на модерацию.
  create: (body: FormData) => apiClient.post<{ id: string }>('/ads', body, { timeoutMs: AD_UPLOAD_TIMEOUT_MS }),

  // Черновик: id — обновить уже сохранённый, без него — создать новый.
  saveDraft: (body: FormData, id?: string) =>
    apiClient.post<{ id: string }>('/ads/draft', body, {
      params: id ? { id } : undefined,
      timeoutMs: AD_UPLOAD_TIMEOUT_MS
    }),

  update: (id: string, body: FormData) =>
    apiClient.patch<{ id: string }>(`/ads/${encodeURIComponent(id)}`, body, { timeoutMs: AD_UPLOAD_TIMEOUT_MS })
}
