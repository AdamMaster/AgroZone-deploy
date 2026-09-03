// senderId — если сообщение от юзера (залогиненный участник ИЛИ админ, они
// оба User на бэкенде); senderGuestId — если от анонимного гостя. Ровно
// одно из двух не null — так же, как в message_sender_check на бэкенде
// (см. schema.prisma сервера).
export interface ISupportMessage {
  id: string
  conversationId: string
  text: string
  attachments: string[]
  createdAt: string
  senderId: string | null
  senderGuestId: string | null
}

// То немногое, что реально нужно фронту от GET /support/conversation —
// участнику не нужен весь Conversation целиком (там ещё куча AD-шных полей
// вроде adId/dealConfirmed, общих на одну таблицу с объявлениями, см.
// комментарий в schema.prisma сервера), только сам факт "тикет уже есть".
export interface ISupportMyConversation {
  id: string
  lastMessageAt: string | null
}

export interface ISupportAdminParticipantUser {
  type: 'user'
  id: string
  displayName: string | null
  picture: string | null
}

export interface ISupportAdminParticipantGuest {
  type: 'guest'
  id: string
  createdAt: string
  blockedAt: string | null
}

export type ISupportAdminParticipant = ISupportAdminParticipantUser | ISupportAdminParticipantGuest

export interface ISupportAdminConversationListItem {
  id: string
  participant: ISupportAdminParticipant
  lastMessage: ISupportMessage | null
  isUnread: boolean
  updatedAt: string
}

// Событие, которое реально прилетает по сокету (см. SupportGateway на
// бэкенде, событие 'support:message') — плоская форма, а не целиком
// Conversation, ровно то, что гейтвей и рассылает.
export interface ISupportSocketMessageEvent {
  conversationId: string
  message: ISupportMessage
  isFromAdmin: boolean
}

// 'support:message-deleted' — модераторское удаление (см.
// SupportGateway.handleMessageDeleted на бэкенде), долетает и админу, и
// собеседнику, чьё сообщение (или сообщение админа) только что скрыли.
export interface ISupportSocketMessageDeletedEvent {
  conversationId: string
  messageId: string
}

// 'support:conversation-cleared' — "удалить все сообщения" одним разом
// (см. SupportGateway.handleConversationCleared на бэкенде).
export interface ISupportSocketConversationClearedEvent {
  conversationId: string
}

// 'support:conversation-hidden' — "удалить чат" из списка тикетов (см.
// SupportGateway.handleConversationHidden на бэкенде). В отличие от
// остальных support-событий долетает только админам, у собеседника
// эквивалента этого события нет вообще.
export interface ISupportSocketConversationHiddenEvent {
  conversationId: string
}
