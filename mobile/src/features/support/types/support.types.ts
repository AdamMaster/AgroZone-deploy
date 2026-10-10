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
