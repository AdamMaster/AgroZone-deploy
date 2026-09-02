// id/slug — nullable: объявление могло быть физически удалено воркером
// после архивации (см. AdsArchivePurgeWorker). Тогда сервер отдаёт снепшот
// заголовка вместо живых данных объявления (см. ConversationsService.getConversations).
export interface IMessageAd {
  id: string | null
  title: string
  images: string[]
  slug: string | null
}

// displayName/picture — nullable, ровно как в модели User на бэкенде
// (пользователь мог не заполнить профиль). deletedAt — не null, если
// собеседник удалил аккаунт (UI показывает явную подпись вместо пустого
// имени, см. ChatHeader/ConversationListItem).
export interface IMessageUser {
  id: string
  displayName: string | null
  picture: string | null
  deletedAt?: string | null
}

export interface IMessage {
  id: string
  conversationId: string
  senderId: string
  text: string
  attachments: string[]
  createdAt: string
}

// Диалог "как он есть" — ровно то, что отдаёт POST /conversations в поле
// conversation. Для отображения в списке используется другая, более богатая
// форма — IConversationListItem (см. ниже), которую отдаёт GET /conversations.
export interface IConversation {
  id: string
  adId: string
  buyerId: string
  sellerId: string
  lastMessageAt: string | null
  buyerLastReadAt: string | null
  sellerLastReadAt: string | null
  dealConfirmed: boolean
  createdAt: string
  updatedAt: string
}

export interface IConversationListItem {
  id: string
  ad: IMessageAd
  counterpart: IMessageUser
  lastMessage: IMessage | null
  dealConfirmed: boolean
  isUnread: boolean
  updatedAt: string
}

export interface IStartConversationResponse {
  conversation: IConversation
  message: IMessage
}

// Элемент списка заблокированных — отдаёт GET /blocked-users. id — это id
// заблокированного юзера (не id самой записи блокировки), его же передаём
// обратно в DELETE /blocked-users/:id при разблокировке.
export interface IBlockedUser {
  id: string
  displayName: string | null
  picture: string | null
  blockedAt: string
}
