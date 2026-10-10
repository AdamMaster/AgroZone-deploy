import { apiClient } from '@/lib/api/api-client'

import type { ChatMessage, ConversationListItem, StartConversationResponse } from '../types/message.types'

export interface MessagesPageParams {
  // createdAt самого старого уже загруженного сообщения — сервер отдаёт
  // сообщения старше него (курсор, а не страницы: в чате всё время
  // появляются новые сообщения, и страницы бы съезжали).
  cursor?: string
  limit: number
}

export const conversationsApi = {
  list: (signal?: AbortSignal) => apiClient.get<ConversationListItem[]>('/conversations', { signal }),

  // Диалог начинает покупатель первым сообщением по объявлению; повторное
  // обращение по тому же объявлению попадает в уже существующий диалог.
  start: (adId: string, text: string) => apiClient.post<StartConversationResponse>('/conversations', { adId, text }),

  messages: (conversationId: string, params: MessagesPageParams, signal?: AbortSignal) =>
    apiClient.get<ChatMessage[]>(`/conversations/${conversationId}/messages`, { params: { ...params }, signal }),

  send: (conversationId: string, text: string) =>
    apiClient.post<ChatMessage>(`/conversations/${conversationId}/messages`, { text }),

  markRead: (conversationId: string) =>
    apiClient.patch<void>(`/conversations/${conversationId}/read`, undefined, { expectBody: false }),

  // Скрывает диалог только у себя: переписка принадлежит обоим участникам.
  remove: (conversationId: string) => apiClient.delete<void>(`/conversations/${conversationId}`, { expectBody: false })
}
