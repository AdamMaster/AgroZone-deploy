import { Message } from '@/generated/prisma/client'

// Живые обновления диалогов по объявлениям. Сервис только сообщает, что
// произошло, а рассылку подключённым клиентам делает ConversationsGateway —
// так же, как у чата поддержки (см. support.service.ts). EventEmitter2 живёт
// в рамках одного процесса: прод — один контейнер server (см. комментарий у
// SUPPORT_MESSAGE_CREATED_EVENT; при нескольких инстансах понадобится
// redis-адаптер socket.io).

// Новое сообщение — получателю и другим устройствам самого отправителя.
export const CONVERSATION_MESSAGE_CREATED_EVENT = 'conversation.message.created'

export interface ConversationMessageCreatedPayload {
  message: Message
  // Оба участника диалога: сообщение нужно обоим, а в какой комнате чей
  // сокет, гейтвей знает по id.
  participantIds: [senderId: string, recipientId: string]
}

// Диалог прочитан (пользователь открыл его) — его же другим устройствам:
// убрать отметку «непрочитано».
export const CONVERSATION_READ_EVENT = 'conversation.read'

// Диалог убран из списка пользователя («Удалить переписку») — его же
// другим устройствам.
export const CONVERSATION_REMOVED_EVENT = 'conversation.removed'

export interface ConversationUserPayload {
  conversationId: string
  userId: string
}

// Продавец отметил сделку состоявшейся или снял отметку — обоим участникам:
// у покупателя в открытом диалоге должна появиться (или пропасть) плашка, у
// продавца — обновиться на его других устройствах.
export const CONVERSATION_DEAL_CHANGED_EVENT = 'conversation.deal.changed'

export interface ConversationDealChangedPayload {
  conversationId: string
  // null — отметка снята.
  dealConfirmedAt: Date | null
  participantIds: [buyerId: string, sellerId: string]
}
