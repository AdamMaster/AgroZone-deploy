import { OnGatewayConnection, OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { OnEvent } from '@nestjs/event-emitter'
import { IncomingMessage } from 'http'
import { Namespace, Socket } from 'socket.io'
import { SessionData } from 'express-session'

import { Conversation } from '@/generated/prisma/client'
import { UserRole } from '@/generated/prisma/enums'

import { SessionMiddlewareHolder } from '@/session/session-middleware.holder'

import {
  SUPPORT_CONVERSATION_CLEARED_EVENT,
  SUPPORT_CONVERSATION_HIDDEN_EVENT,
  SUPPORT_MESSAGE_CREATED_EVENT,
  SUPPORT_MESSAGE_DELETED_EVENT,
  SupportConversationClearedPayload,
  SupportConversationHiddenPayload,
  SupportMessageCreatedPayload,
  SupportMessageDeletedPayload
} from './support.service'
import { SupportIdentityService } from './support-identity.service'
import { SupportParticipant } from './types/support-participant.type'

// Комната для всех подключённых АДМИНОВ сразу (сейчас админ один, но
// схема поддерживает нескольких — см. schema.prisma, Conversation.sellerId
// у SUPPORT всегда null, отвечает любой ADMIN) — получает вообще все
// события по всем тикетам, этого достаточно и для бейджа в инбоксе, и для
// живого треда, который админ сейчас открыл (отдельная комната на
// конкретный диалог админу не нужна).
const ADMIN_ROOM = 'support:admin'

// Личная комната участника (юзера или гостя) — не привязана к id диалога
// специально: сокет может подключиться раньше, чем участник вообще напишет
// первое сообщение (диалога physически ещё нет), а после подключения
// комната не должна меняться, даже если гостя смержили в юзера (см.
// SupportGuestsService.mergeIntoUser — TODO, ещё не подключено к
// auth-флоу). Опознаём по личности, а не по диалогу.
function userRoom(userId: string): string {
  return `support:participant:user:${userId}`
}

function guestRoom(guestId: string): string {
  return `support:participant:guest:${guestId}`
}

function participantRoom(participant: SupportParticipant): string {
  return participant.type === 'user' ? userRoom(participant.user.id) : guestRoom(participant.guest.id)
}

// Namespace, а не голый корневой сокет — на случай, если в проекте позже
// появятся другие сокет-фичи (например, live-статус объявления), чтобы им
// не пришлось выгребать support-специфичный трафик из общего потока.
//
// cors намеренно НЕ задан тут декоратором — см. SupportIoAdapter (main.ts):
// декоратор выполняется до того, как ConfigModule успевает прогрузить .env
// в деве, так что ALLOWED_ORIGIN конфигурируется отдельно, через кастомный
// IoAdapter, когда ConfigService из DI уже точно готов.
@WebSocketGateway({ namespace: '/support' })
export class SupportGateway implements OnGatewayInit, OnGatewayConnection {
  // Реальный рантайм-тип — Namespace (см. afterInit ниже), не корневой
  // Server — держим тип поля в соответствии с этим, а не с тем, что Nest
  // формально объявляет для @WebSocketServer().
  @WebSocketServer()
  private readonly server!: Namespace

  constructor(
    private readonly identityService: SupportIdentityService,
    private readonly sessionMiddlewareHolder: SessionMiddlewareHolder
  ) {}

  // Из-за namespace: '/support' в декораторе то, что реально прилетает сюда
  // (и в @WebSocketServer() тоже) — это не корневой Server, а объект
  // Namespace (то, что возвращает io.of('/support')). У Namespace нет
  // собственного .engine — есть только обратная ссылка .server на корневой
  // Server, у которого .engine и есть (см. socket.io/dist/namespace.js —
  // this.server = server в конструкторе — и socket.io/dist/index.js —
  // this.engine объявлен только в самом Server). Дженерик-тип Server у
  // параметра — это лишь то, что заявляет сам декоратор, реальный рантайм
  // объект шире.
  //
  // У Nest на всё приложение один HTTP-сервер и один socket.io Server —
  // namespace это чисто маршрутизация поверх него, а не отдельный движок
  // (engine.io). Поэтому engine.use() тут применяется один раз на весь
  // сокет-трафик приложения, а не только на /support — сейчас это ровно
  // то, что нужно, других неймспейсов в проекте нет. См.
  // https://socket.io/how-to/use-with-express-session — тот же приём, что
  // и там: та же самая миддлварь, что и у Express (см.
  // SessionMiddlewareHolder), разбирает cookie сессии прямо на хэндшейке,
  // до того как соединение попадёт в handleConnection.
  afterInit(namespace: Namespace) {
    namespace.server.engine.use(this.sessionMiddlewareHolder.get())
  }

  // Никакого создания нового гостя тут (см.
  // SupportIdentityService.resolveForHandshake) — виджет должен успеть
  // сходить по REST (GET /support/conversation) ДО открытия сокета, это и
  // заводит гостя, и корректно сохраняет cookie обычным HTTP-ответом.
  // Если по сессии нет ни юзера, ни гостя — слушать сокету нечего, отказ.
  async handleConnection(socket: Socket) {
    try {
      const session = (socket.request as IncomingMessage & { session?: SessionData }).session
      const participant = await this.identityService.resolveForHandshake(session)

      if (participant?.type === 'user' && participant.user.role === UserRole.ADMIN) {
        await socket.join(ADMIN_ROOM)
        return
      }

      if (!participant) {
        socket.emit('support:error', { code: 'NOT_INITIALIZED' })
        socket.disconnect(true)
        return
      }

      await socket.join(participantRoom(participant))
    } catch (error) {
      console.error('❌ SupportGateway: не удалось обработать подключение сокета:', error)
      socket.disconnect(true)
    }
  }

  // Ловит то же событие, что раньше (до этого гейтвея) просто утекало в
  // никуда — SupportService ничего не знает про сокеты, только эмитит (см.
  // support.service.ts). Рассылаем И в комнату админов (инбокс, живой
  // тред), И в личную комнату собеседника (второй участник видит ответ
  // сразу, без обновления страницы) — это не всегда одна и та же аудитория:
  // сообщение от гостя должно долететь до админов, сообщение от админа —
  // до гостя, а собственное сообщение участника, отправленное с одной
  // вкладки, долетает и до его же других открытых вкладок.
  @OnEvent(SUPPORT_MESSAGE_CREATED_EVENT)
  handleMessageCreated({ conversation, message, isFromAdmin }: SupportMessageCreatedPayload) {
    const payload = { conversationId: conversation.id, message, isFromAdmin }

    this.server.to(ADMIN_ROOM).emit('support:message', payload)
    this.server.to(this.conversationParticipantRoom(conversation)).emit('support:message', payload)
  }

  // Модераторское удаление (см. SupportService.deleteMessage) — та же
  // аудитория, что и у нового сообщения: обеим сторонам нужно вживую убрать
  // сообщение из своего кэша, не дожидаясь перезагрузки страницы.
  @OnEvent(SUPPORT_MESSAGE_DELETED_EVENT)
  handleMessageDeleted({ conversation, messageId }: SupportMessageDeletedPayload) {
    const payload = { conversationId: conversation.id, messageId }

    this.server.to(ADMIN_ROOM).emit('support:message-deleted', payload)
    this.server.to(this.conversationParticipantRoom(conversation)).emit('support:message-deleted', payload)
  }

  // "Удалить всё" (см. SupportService.deleteAllMessages) — та же аудитория,
  // одно событие вместо пачки support:message-deleted.
  @OnEvent(SUPPORT_CONVERSATION_CLEARED_EVENT)
  handleConversationCleared({ conversation }: SupportConversationClearedPayload) {
    const payload = { conversationId: conversation.id }

    this.server.to(ADMIN_ROOM).emit('support:conversation-cleared', payload)
    this.server.to(this.conversationParticipantRoom(conversation)).emit('support:conversation-cleared', payload)
  }

  // "Удалить чат" (см. SupportService.hideConversation) — в отличие от
  // handleConversationCleared выше, это НЕ рассылается собеседнику: скрытие
  // тикета из инбокса — дело только админа, участник ничего не должен
  // почувствовать. Долетает только до ADMIN_ROOM (в т.ч. до других вкладок
  // того же админа).
  @OnEvent(SUPPORT_CONVERSATION_HIDDEN_EVENT)
  handleConversationHidden({ conversation }: SupportConversationHiddenPayload) {
    this.server.to(ADMIN_ROOM).emit('support:conversation-hidden', { conversationId: conversation.id })
  }

  // buyerId/guestId — оба String? на уровне колонки (см. schema.prisma), но
  // это гарантированно SUPPORT-диалог (обе точки вызова тут — только
  // SUPPORT-события), а для него CHECK-constraint
  // conversation_participant_check гарантирует ровно одно из двух
  // заполненным.
  private conversationParticipantRoom(conversation: Conversation): string {
    return conversation.buyerId ? userRoom(conversation.buyerId) : guestRoom(conversation.guestId!)
  }
}
