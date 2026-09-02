import { api } from '@/shared/api'

import { IConversationListItem, IMessage, IStartConversationResponse } from '../types/message.types'

class ConversationsService {
  private URL = 'conversations'

  async findAll(): Promise<IConversationListItem[]> {
    return api.get<IConversationListItem[]>(this.URL)
  }

  async start(adId: string, text: string): Promise<IStartConversationResponse> {
    return api.post<IStartConversationResponse>(this.URL, { adId, text })
  }

  async findMessages(conversationId: string, params?: { cursor?: string; limit?: number }): Promise<IMessage[]> {
    return api.get<IMessage[]>(`${this.URL}/${conversationId}/messages`, { params })
  }

  async sendMessage(conversationId: string, text: string): Promise<IMessage> {
    return api.post<IMessage>(`${this.URL}/${conversationId}/messages`, { text })
  }

  async markRead(conversationId: string): Promise<void> {
    await api.patch(`${this.URL}/${conversationId}/read`, {})
  }

  // Скрывает диалог только у текущего пользователя — не физическое удаление
  // (см. комментарий в schema.prisma на бэкенде).
  async deleteConversation(conversationId: string): Promise<void> {
    await api.delete(`${this.URL}/${conversationId}`)
  }
}

export const conversationsService = new ConversationsService()
