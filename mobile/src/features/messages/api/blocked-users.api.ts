import { apiClient } from '@/lib/api/api-client'

import type { BlockedUser } from '../types/message.types'

export const blockedUsersApi = {
  list: (signal?: AbortSignal) => apiClient.get<BlockedUser[]>('/blocked-users', { signal }),

  block: (userId: string) => apiClient.post<void>(`/blocked-users/${userId}`, undefined, { expectBody: false }),

  unblock: (userId: string) => apiClient.delete<void>(`/blocked-users/${userId}`, { expectBody: false })
}
