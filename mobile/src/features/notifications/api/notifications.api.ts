import { apiClient } from '@/lib/api/api-client'

import type { AppNotification } from '../types/notification.types'

export const notificationsApi = {
  list: (limit: number, signal?: AbortSignal) =>
    apiClient.get<AppNotification[]>('/notifications', { params: { limit }, signal }),

  unreadCount: (signal?: AbortSignal) => apiClient.get<{ count: number }>('/notifications/unread-count', { signal }),

  markRead: (id: string) => apiClient.patch<AppNotification>(`/notifications/${id}/read`),

  markAllRead: () => apiClient.patch<{ success: boolean }>('/notifications/read-all')
}
