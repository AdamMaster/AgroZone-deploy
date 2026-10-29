import { apiClient } from '@/lib/api/api-client'
import { appendFile, uploadTimeoutMs } from '@/lib/api/upload-file'

import type {
  ChatMessage,
  ConversationListItem,
  DealConfirmation,
  MessageDraft,
  StartConversationResponse
} from '../types/message.types'

export interface MessagesPageParams {
  // createdAt самого старого уже загруженного сообщения — сервер отдаёт
  // сообщения старше него (курсор, а не страницы: в чате всё время
  // появляются новые сообщения, и страницы бы съезжали).
  cursor?: string
  limit: number
}

// Сообщение уходит как multipart/form-data: текст в поле text, фото — в поле
// files (ConversationsController на сервере). Ссылки на фото выдаёт сервер.
function messageForm({ text, photos }: MessageDraft, fields: Record<string, string> = {}): FormData {
  const form = new FormData()

  for (const [name, value] of Object.entries(fields)) form.append(name, value)
  if (text) form.append('text', text)
  for (const photo of photos) appendFile(form, 'files', photo)

  return form
}

export const conversationsApi = {
  list: (signal?: AbortSignal) => apiClient.get<ConversationListItem[]>('/conversations', { signal }),

  // Диалог начинает покупатель первым сообщением по объявлению; повторное
  // обращение по тому же объявлению попадает в уже существующий диалог.
  start: (adId: string, draft: MessageDraft) => {
    const form = messageForm(draft, { adId })

    return apiClient.post<StartConversationResponse>('/conversations', form, { timeoutMs: uploadTimeoutMs(form) })
  },

  messages: (conversationId: string, params: MessagesPageParams, signal?: AbortSignal) =>
    apiClient.get<ChatMessage[]>(`/conversations/${conversationId}/messages`, { params: { ...params }, signal }),

  send: (conversationId: string, draft: MessageDraft) => {
    const form = messageForm(draft)

    return apiClient.post<ChatMessage>(`/conversations/${conversationId}/messages`, form, {
      timeoutMs: uploadTimeoutMs(form)
    })
  },

  markRead: (conversationId: string) =>
    apiClient.patch<void>(`/conversations/${conversationId}/read`, undefined, { expectBody: false }),

  // Продавец отмечает сделку состоявшейся (confirmed = true) или снимает
  // отметку. Идемпотентно: повторный вызов вернёт то же состояние.
  setDeal: (conversationId: string, confirmed: boolean) =>
    apiClient.patch<DealConfirmation>(`/conversations/${conversationId}/deal`, { confirmed }),

  // Скрывает диалог только у себя: переписка принадлежит обоим участникам.
  remove: (conversationId: string) => apiClient.delete<void>(`/conversations/${conversationId}`, { expectBody: false })
}
