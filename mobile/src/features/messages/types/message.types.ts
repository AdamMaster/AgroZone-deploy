// Сообщение переписки — общее для диалогов по объявлениям и чата
// поддержки: у поддержки вместо senderId может быть senderGuestId (гость
// сайта), приложению он не нужен.
export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string | null
  text: string
  attachments: string[]
  createdAt: string
}

// Объявление диалога. id — null, если объявление снято или удалено: тогда
// ссылки на него нет, заголовок — из снимка на момент начала диалога
// (ConversationsService.getConversations).
export interface ConversationAd {
  id: string | null
  title: string
  images: string[]
}

// Собеседник. deletedAt — собеседник удалил аккаунт.
export interface ConversationCounterpart {
  id: string
  displayName: string | null
  picture: string | null
  deletedAt: string | null
}

// Диалог в списке «Сообщения» — ответ GET /conversations.
export interface ConversationListItem {
  id: string
  ad: ConversationAd
  counterpart: ConversationCounterpart
  lastMessage: ChatMessage | null
  isUnread: boolean
  updatedAt: string
}

export interface StartConversationResponse {
  conversation: { id: string }
  message: ChatMessage
}

// Заблокированный пользователь — ответ GET /blocked-users (id — самого
// пользователя, его же передаём при разблокировке).
export interface BlockedUser {
  id: string
  displayName: string | null
  picture: string | null
  blockedAt: string
}

// Страница истории: сообщения в хронологическом порядке и есть ли старше.
export interface ChatHistory {
  messages: ChatMessage[]
  hasOlder: boolean
}
