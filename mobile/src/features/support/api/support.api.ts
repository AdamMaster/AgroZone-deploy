import type { MessagesPageParams } from '@/features/messages/api/conversations.api'
import type { ChatMessage } from '@/features/messages/types/message.types'

import { apiClient } from '@/lib/api/api-client'

import type { SupportAdminConversation } from '../types/support.types'

const NO_BODY = { expectBody: false } as const

// Чат с поддержкой: сторона пользователя и сторона администратора (инбокс
// обращений). Админские ручки сервер отдаёт только роли ADMIN.
export const supportApi = {
  messages: (params: MessagesPageParams, signal?: AbortSignal) =>
    apiClient.get<ChatMessage[]>('/support/conversation/messages', { params: { ...params }, signal }),

  send: (text: string) => apiClient.post<ChatMessage>('/support/conversation/messages', { text }),

  markRead: () => apiClient.patch<void>('/support/conversation/read', undefined, NO_BODY),

  adminConversations: (signal?: AbortSignal) =>
    apiClient.get<SupportAdminConversation[]>('/support/admin/conversations', { signal }),

  adminMessages: (conversationId: string, params: MessagesPageParams, signal?: AbortSignal) =>
    apiClient.get<ChatMessage[]>(`/support/admin/conversations/${conversationId}/messages`, {
      params: { ...params },
      signal
    }),

  adminSend: (conversationId: string, text: string) =>
    apiClient.post<ChatMessage>(`/support/admin/conversations/${conversationId}/messages`, { text }),

  adminMarkRead: (conversationId: string) =>
    apiClient.patch<void>(`/support/admin/conversations/${conversationId}/read`, undefined, NO_BODY),

  // Модераторское удаление: сообщение пропадает у обеих сторон.
  adminDeleteMessage: (conversationId: string, messageId: string) =>
    apiClient.delete<void>(`/support/admin/conversations/${conversationId}/messages/${messageId}`, NO_BODY),

  adminDeleteAllMessages: (conversationId: string) =>
    apiClient.delete<void>(`/support/admin/conversations/${conversationId}/messages`, NO_BODY),

  // Убирает обращение из списка администратора; переписка участника не
  // трогается, и обращение вернётся, если он напишет снова.
  adminHideConversation: (conversationId: string) =>
    apiClient.delete<void>(`/support/admin/conversations/${conversationId}`, NO_BODY),

  blockGuest: (guestId: string) => apiClient.post<void>(`/support/admin/guests/${guestId}/block`, {}, NO_BODY),

  unblockGuest: (guestId: string) => apiClient.post<void>(`/support/admin/guests/${guestId}/unblock`, {}, NO_BODY)
}
