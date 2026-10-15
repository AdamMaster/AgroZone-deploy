import { apiClient } from '@/lib/api/api-client'
import { UPLOAD_TIMEOUT_MS } from '@/lib/api/upload-file'

import type { EditableAd } from '../types/ad-form.types'

export const adFormApi = {
  fetchForEdit: (id: string, signal?: AbortSignal) =>
    apiClient.get<EditableAd>(`/ads/my/${encodeURIComponent(id)}`, { signal }),

  // Новое объявление уходит на модерацию.
  create: (body: FormData) => apiClient.post<{ id: string }>('/ads', body, { timeoutMs: UPLOAD_TIMEOUT_MS }),

  // Черновик: id — обновить уже сохранённый, без него — создать новый.
  saveDraft: (body: FormData, id?: string) =>
    apiClient.post<{ id: string }>('/ads/draft', body, {
      params: id ? { id } : undefined,
      timeoutMs: UPLOAD_TIMEOUT_MS
    }),

  update: (id: string, body: FormData) =>
    apiClient.patch<{ id: string }>(`/ads/${encodeURIComponent(id)}`, body, { timeoutMs: UPLOAD_TIMEOUT_MS })
}
