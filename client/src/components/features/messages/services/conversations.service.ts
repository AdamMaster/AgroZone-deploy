import { api } from '@/shared/api'

import {
  IConversationListItem,
  IDealConfirmation,
  IMessage,
  IMessageDraft,
  IStartConversationResponse
} from '../types/message.types'
import { buildMessageFormData } from '../utils/build-message-form-data'

class ConversationsService {
  private URL = 'conversations'

  async findAll(): Promise<IConversationListItem[]> {
    return api.get<IConversationListItem[]>(this.URL)
  }

  async start(adId: string, draft: IMessageDraft): Promise<IStartConversationResponse> {
    return api.post<IStartConversationResponse>(this.URL, buildMessageFormData(draft, { adId }))
  }

  async findMessages(conversationId: string, params?: { cursor?: string; limit?: number }): Promise<IMessage[]> {
    return api.get<IMessage[]>(`${this.URL}/${conversationId}/messages`, { params })
  }

  async sendMessage(conversationId: string, draft: IMessageDraft): Promise<IMessage> {
    return api.post<IMessage>(`${this.URL}/${conversationId}/messages`, buildMessageFormData(draft))
  }

  async markRead(conversationId: string): Promise<void> {
    await api.patch(`${this.URL}/${conversationId}/read`, {})
  }

  // Продавец отмечает сделку состоявшейся (confirmed = true) или снимает
  // отметку (false). Идемпотентно: повторный вызов вернёт то же состояние.
  async setDeal(conversationId: string, confirmed: boolean): Promise<IDealConfirmation> {
    return api.patch<IDealConfirmation>(`${this.URL}/${conversationId}/deal`, { confirmed })
  }

  // Скрывает диалог только у текущего пользователя — не физическое удаление
  // (см. комментарий в schema.prisma на бэкенде).
  async deleteConversation(conversationId: string): Promise<void> {
    await api.delete(`${this.URL}/${conversationId}`)
  }
}

export const conversationsService = new ConversationsService()
