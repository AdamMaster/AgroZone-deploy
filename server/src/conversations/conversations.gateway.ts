import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { OnEvent } from '@nestjs/event-emitter'
import { IncomingMessage } from 'http'
import { Namespace, Socket } from 'socket.io'
import { SessionData } from 'express-session'

import { UserService } from '@/user/user.service'

import {
  CONVERSATION_DEAL_CHANGED_EVENT,
  CONVERSATION_MESSAGE_CREATED_EVENT,
  CONVERSATION_READ_EVENT,
  CONVERSATION_REMOVED_EVENT,
  ConversationDealChangedPayload,
  ConversationMessageCreatedPayload,
  ConversationUserPayload
} from './conversations.events'

// Личная комната пользователя: у него может быть открыто несколько
// устройств и вкладок, все получают одни и те же события.
function userRoom(userId: string): string {
  return `conversations:user:${userId}`
}

// Живые обновления «Сообщений» (диалоги по объявлениям) — вместо опроса
// списка и открытого диалога каждые несколько секунд. Клиент слушает, пока
// пользователь вошёл; пропущенное за время разрыва подтягивает обычным
// запросом при переподключении.
//
// Сессию на хэндшейке разбирает та же цепочка middleware, что и у Express:
// она подключается к общему engine.io один раз, в SupportGateway.afterInit
// (у приложения один HTTP-сервер и один socket.io Server, namespace — лишь
// маршрутизация поверх него), поэтому тут её повторно не навешиваем — иначе
// каждый хэндшейк разбирал бы сессию дважды. CORS задаёт SupportIoAdapter.
@WebSocketGateway({ namespace: '/conversations' })
export class ConversationsGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server!: Namespace

  constructor(private readonly userService: UserService) {}

  // Только вошедшие: у диалогов по объявлениям нет гостей. Нет живого
  // пользователя в сессии — слушать нечего, отказ.
  async handleConnection(socket: Socket) {
    try {
      const session = (socket.request as IncomingMessage & { session?: SessionData }).session
      const userId = session?.userId
      const user = userId ? await this.userService.findById(userId).catch(() => null) : null

      if (!user || user.deletedAt) {
        socket.emit('conversations:error', { code: 'UNAUTHORIZED' })
        socket.disconnect(true)
        return
      }

      await socket.join(userRoom(user.id))
    } catch (error) {
      console.error('❌ ConversationsGateway: не удалось обработать подключение сокета:', error)
      socket.disconnect(true)
    }
  }

  // Есть ли у пользователя открытое соединение (сайт или приложение на
  // экране). Нужно, чтобы не слать push тому, кто и так видит сообщение.
  isUserOnline(userId: string): boolean {
    return (this.server.adapter.rooms.get(userRoom(userId))?.size ?? 0) > 0
  }

  @OnEvent(CONVERSATION_MESSAGE_CREATED_EVENT)
  handleMessageCreated({ message, participantIds }: ConversationMessageCreatedPayload) {
    const payload = { conversationId: message.conversationId, message }

    this.server.to(participantIds.map(userRoom)).emit('conversations:message', payload)
  }

  @OnEvent(CONVERSATION_READ_EVENT)
  handleRead({ conversationId, userId }: ConversationUserPayload) {
    this.server.to(userRoom(userId)).emit('conversations:read', { conversationId })
  }

  @OnEvent(CONVERSATION_REMOVED_EVENT)
  handleRemoved({ conversationId, userId }: ConversationUserPayload) {
    this.server.to(userRoom(userId)).emit('conversations:removed', { conversationId })
  }

  @OnEvent(CONVERSATION_DEAL_CHANGED_EVENT)
  handleDealChanged({ conversationId, dealConfirmedAt, participantIds }: ConversationDealChangedPayload) {
    this.server.to(participantIds.map(userRoom)).emit('conversations:deal', { conversationId, dealConfirmedAt })
  }
}
