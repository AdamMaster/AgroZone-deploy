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

// Сообщение, которое пользователь собирается отправить: текст и/или фото
// (хотя бы что-то одно — см. MessageComposer).
export interface IMessageDraft {
  text: string
  photos: File[]
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
  dealConfirmedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface IConversationListItem {
  id: string
  ad: IMessageAd
  counterpart: IMessageUser
  lastMessage: IMessage | null
  // Продавец ли текущий пользователь в этом диалоге — отметить сделку
  // состоявшейся может только он (см. DealBar).
  isSeller: boolean
  // Можно ли сейчас отметить сделку: продавец уже отвечал в диалоге. Правило
  // считает сервер, клиент его только показывает.
  canConfirmDeal: boolean
  // Когда продавец отметил сделку состоявшейся; null — не отмечена.
  dealConfirmedAt: string | null
  isUnread: boolean
  updatedAt: string
}

// События сокета /conversations (ConversationsGateway на бэкенде).
export interface IConversationSocketEvent {
  conversationId: string
}

export interface IConversationSocketDealEvent extends IConversationSocketEvent {
  dealConfirmedAt: string | null
}

export interface IConversationSocketMessageEvent extends IConversationSocketEvent {
  message: IMessage
}

// Ответ PATCH /conversations/:id/deal.
export interface IDealConfirmation {
  dealConfirmedAt: string | null
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
