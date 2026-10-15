import { apiClient } from '@/lib/api/api-client'
import { UPLOAD_TIMEOUT_MS, appendFile } from '@/lib/api/upload-file'

import type { ChatMessage, ConversationListItem, MessageDraft, StartConversationResponse } from '../types/message.types'

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
  start: (adId: string, draft: MessageDraft) =>
    apiClient.post<StartConversationResponse>('/conversations', messageForm(draft, { adId }), {
      timeoutMs: UPLOAD_TIMEOUT_MS
    }),

  messages: (conversationId: string, params: MessagesPageParams, signal?: AbortSignal) =>
    apiClient.get<ChatMessage[]>(`/conversations/${conversationId}/messages`, { params: { ...params }, signal }),

  send: (conversationId: string, draft: MessageDraft) =>
    apiClient.post<ChatMessage>(`/conversations/${conversationId}/messages`, messageForm(draft), {
      timeoutMs: UPLOAD_TIMEOUT_MS
    }),

  markRead: (conversationId: string) =>
    apiClient.patch<void>(`/conversations/${conversationId}/read`, undefined, { expectBody: false }),

  // Скрывает диалог только у себя: переписка принадлежит обоим участникам.
  remove: (conversationId: string) => apiClient.delete<void>(`/conversations/${conversationId}`, { expectBody: false })
}
