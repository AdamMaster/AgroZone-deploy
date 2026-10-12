import { apiClient } from '@/lib/api/api-client'

import type { PublicSeller } from '../types/seller.types'

export const sellersApi = {
  // Публичная ручка: 404, если продавца нет или аккаунт удалён.
  fetchPublic: (id: string, signal?: AbortSignal) => apiClient.get<PublicSeller>(`/users/${id}/public`, { signal })
}
