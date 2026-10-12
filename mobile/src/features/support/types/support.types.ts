import type { ChatMessage } from '@/features/messages/types/message.types'

// События сокета /support (SupportGateway на сервере).
export interface SupportMessageEvent {
  conversationId: string
  message: ChatMessage
  isFromAdmin: boolean
}

export interface SupportMessageDeletedEvent {
  conversationId: string
  messageId: string
}

export interface SupportConversationClearedEvent {
  conversationId: string
}

// Участник обращения в инбоксе администратора: вошедший пользователь или
// анонимный гость сайта (ISupportAdminParticipant на сайте).
export interface SupportParticipantUser {
  type: 'user'
  id: string
  displayName: string | null
  picture: string | null
}

export interface SupportParticipantGuest {
  type: 'guest'
  id: string
  createdAt: string
  blockedAt: string | null
}

export type SupportParticipant = SupportParticipantUser | SupportParticipantGuest

// Обращение в списке администратора — ответ GET /support/admin/conversations.
export interface SupportAdminConversation {
  id: string
  participant: SupportParticipant
  lastMessage: ChatMessage | null
  isUnread: boolean
  updatedAt: string
}

// «Удалить чат» в другой вкладке/на другом устройстве администратора.
export interface SupportConversationHiddenEvent {
  conversationId: string
}
