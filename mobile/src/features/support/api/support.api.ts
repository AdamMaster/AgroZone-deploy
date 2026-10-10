import type { MessagesPageParams } from '@/features/messages/api/conversations.api'
import type { ChatMessage } from '@/features/messages/types/message.types'

import { apiClient } from '@/lib/api/api-client'

// Чат с поддержкой со стороны пользователя. Инбокс обращений для
// администратора — только на сайте.
export const supportApi = {
  messages: (params: MessagesPageParams, signal?: AbortSignal) =>
    apiClient.get<ChatMessage[]>('/support/conversation/messages', { params: { ...params }, signal }),

  send: (text: string) => apiClient.post<ChatMessage>('/support/conversation/messages', { text }),

  markRead: () => apiClient.patch<void>('/support/conversation/read', undefined, { expectBody: false })
}
