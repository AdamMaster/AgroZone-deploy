import { api } from '@/shared/api'

import {
  ISupportAdminConversationListItem,
  ISupportMessage,
  ISupportMyConversation
} from '../types/support.types'

class SupportService {
  private URL = 'support'

  // --- участник (юзер или гость) ---

  async getMyConversation(): Promise<ISupportMyConversation | null> {
    return api.get<ISupportMyConversation | null>(`${this.URL}/conversation`)
  }

  async getMyMessages(params?: { cursor?: string; limit?: number }): Promise<ISupportMessage[]> {
    return api.get<ISupportMessage[]>(`${this.URL}/conversation/messages`, { params })
  }

  async sendMyMessage(text: string): Promise<ISupportMessage> {
    return api.post<ISupportMessage>(`${this.URL}/conversation/messages`, { text })
  }

  async markMyConversationRead(): Promise<void> {
    await api.patch(`${this.URL}/conversation/read`, {})
  }

  // --- админ ---

  async getAdminConversations(): Promise<ISupportAdminConversationListItem[]> {
    return api.get<ISupportAdminConversationListItem[]>(`${this.URL}/admin/conversations`)
  }

  async getAdminMessages(
    conversationId: string,
    params?: { cursor?: string; limit?: number }
  ): Promise<ISupportMessage[]> {
    return api.get<ISupportMessage[]>(`${this.URL}/admin/conversations/${conversationId}/messages`, { params })
  }

  async sendAdminMessage(conversationId: string, text: string): Promise<ISupportMessage> {
    return api.post<ISupportMessage>(`${this.URL}/admin/conversations/${conversationId}/messages`, { text })
  }

  async markAdminConversationRead(conversationId: string): Promise<void> {
    await api.patch(`${this.URL}/admin/conversations/${conversationId}/read`, {})
  }

  async deleteAdminMessage(conversationId: string, messageId: string): Promise<void> {
    await api.delete(`${this.URL}/admin/conversations/${conversationId}/messages/${messageId}`)
  }

  async deleteAllAdminMessages(conversationId: string): Promise<void> {
    await api.delete(`${this.URL}/admin/conversations/${conversationId}/messages`)
  }

  async hideAdminConversation(conversationId: string): Promise<void> {
    await api.delete(`${this.URL}/admin/conversations/${conversationId}`)
  }

  async blockGuest(guestId: string): Promise<void> {
    await api.post(`${this.URL}/admin/guests/${guestId}/block`, {})
  }

  async unblockGuest(guestId: string): Promise<void> {
    await api.post(`${this.URL}/admin/guests/${guestId}/unblock`, {})
  }
}

export const supportService = new SupportService()
