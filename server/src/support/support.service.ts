import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { Conversation, Message, Prisma } from '@/generated/prisma/client'
import { ConversationType } from '@/generated/prisma/enums'

import { MailService } from '@/libs/mail/mail.service'
import { PrismaService } from '@/prisma/prisma.service'

import { FindMessagesQueryDto } from '@/conversations/dto/find-messages-query.dto'

import { SupportGuestsService } from './support-guests.service'
import { SupportParticipant } from './types/support-participant.type'

// Событие, которое ловит SupportGateway (сокеты), чтобы разослать
// сообщение живым подключениям — сама запись в базу и вся бизнес-логика
// (антидубли, письмо на первое сообщение) живут только тут, в сервисе;
// гейтвей ничего не решает сам, только транслирует.
//
// EventEmitter2 — строго в рамках одного процесса. Сейчас это ок: прод —
// один-единственный контейнер server на одной Selectel VM, без реплик (см.
// docker-compose.prod.yml). Если это когда-нибудь изменится (несколько
// инстансов server за балансировщиком) — это событие перестанет долетать
// до сокетов, подключённых к ДРУГОМУ инстансу, и realtime молча сломается
// только для части пользователей. Тогда понадобится либо
// @socket.io/redis-adapter (Redis уже есть в проекте — под сессии и
// BullMQ), либо публикация этого события через Redis pub/sub вместо
// EventEmitter2. Не делаем это заранее — лишняя инфраструктура под
// сценарий, которого пока нет.
export const SUPPORT_MESSAGE_CREATED_EVENT = 'support.message.created'

export interface SupportMessageCreatedPayload {
  // Целиком Conversation, а не голый conversationId — SupportGateway
  // строит из неё комнату получателя (buyerId/guestId, см.
  // support.gateway.ts) без лишнего похода в базу за диалогом, который мы
  // и так только что читали/обновляли прямо тут, в createMessage.
  conversation: Conversation
  message: Message
  isFromAdmin: boolean
}

// Тот же принцип, что и у SUPPORT_MESSAGE_CREATED_EVENT выше — гейтвей
// только транслирует, вся логика (авторизация на удаление, сам soft-delete)
// живёт в deleteMessage.
export const SUPPORT_MESSAGE_DELETED_EVENT = 'support.message.deleted'

export interface SupportMessageDeletedPayload {
  conversation: Conversation
  messageId: string
}

// Массовое удаление (см. SupportService.deleteAllMessages) — одно событие
// на весь тикет, а не N штук SUPPORT_MESSAGE_DELETED_EVENT подряд: и
// дешевле, и фронту незачем разбирать сообщения по одному, когда смысл в
// том, чтобы список обнулился целиком.
export const SUPPORT_CONVERSATION_CLEARED_EVENT = 'support.conversation.cleared'

export interface SupportConversationClearedPayload {
  conversation: Conversation
}

// "Удалить чат" в списке тикетов — не про содержимое переписки (см. выше),
// а про уборку админского инбокса (см. hideConversation). Собеседника это
// никак не касается — его сторона переписки не меняется вообще, поэтому
// событие получают только админы (см. SupportGateway.handleConversationHidden).
export const SUPPORT_CONVERSATION_HIDDEN_EVENT = 'support.conversation.hidden'

export interface SupportConversationHiddenPayload {
  conversation: Conversation
}

// То немногое, что реально нужно, чтобы записать сообщение в базу — id
// отправителя и его тип. В отличие от SupportParticipant (который несёт
// целиком гидратированного User/SupportGuest, потому что нужен ещё и для
// авторизации/отображения имени), сюда нарочно не тащим лишние поля: это
// убирает необходимость собирать fake-User объект для ответа админа (см.
// sendAdminMessage) только чтобы подогнать его под форму SupportParticipant.
type MessageSender = { type: 'user'; userId: string } | { type: 'guest'; guestId: string }

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supportGuestsService: SupportGuestsService,
    private readonly mailService: MailService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  // Найти SUPPORT-диалог текущего участника или null, если он ещё ни разу
  // не писал — специально отдельно от sendMessage: виджет при открытии
  // должен уметь показать "диалога ещё нет" (пустое состояние с одним
  // инпутом), не создавая пустую запись в базе только от того, что человек
  // раскрыл чат и ничего не написал.
  async getMyConversation(participant: SupportParticipant) {
    return this.prisma.conversation.findFirst({
      where: this.participantWhere(participant)
    })
  }

  async getMyMessages(participant: SupportParticipant, query: FindMessagesQueryDto) {
    const conversation = await this.getMyConversation(participant)

    if (!conversation) {
      return []
    }

    return this.getMessages(conversation.id, query)
  }

  // Найти-или-создать SUPPORT-диалог участника и сразу отправить туда
  // сообщение — одним вызовом, потому что в отличие от объявлений тут нет
  // сценария "несколько диалогов на одного участника": весь чат поддержки
  // одного человека — это ровно один тикет (см. partial unique index
  // conversation_support_buyer_unique/guest_unique в миграции).
  async sendMyMessage(participant: SupportParticipant, text: string) {
    if (participant.type === 'guest' && participant.guest.blockedAt) {
      throw new ForbiddenException('Обращение в поддержку недоступно')
    }

    const conversation = await this.getOrCreateConversation(participant)

    // notifyDescription задан — единственное место, откуда вообще уходит
    // письмо на первое сообщение нового тикета (см. createMessage).
    return this.createMessage(conversation, this.toSender(participant), text, {
      notifyDescription: this.describeParticipant(participant)
    })
  }

  async markMyConversationRead(participant: SupportParticipant) {
    if (participant.type === 'guest') {
      // У гостя нет отдельного курсора прочтения — гостю просто нечего "не
      // дочитать" на своей стороне: он либо смотрит на открытый виджет
      // (тогда сообщение админа и так у него на экране), либо не смотрит, и
      // следующий заход просто покажет всю историю.
      return
    }

    const conversation = await this.getMyConversation(participant)

    if (!conversation) return

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: { buyerLastReadAt: new Date() }
    })
  }

  // --- Админская часть ---

  // Инбокс всех SUPPORT-тикетов, отсортированный по свежести — тот же
  // принцип, что ConversationsService.getConversations, но без разделения
  // на buyer/seller (у SUPPORT sellerId всегда null, отвечает любой ADMIN,
  // см. schema.prisma) и c учётом того, что "собеседник" — либо User, либо
  // SupportGuest.
  async getAdminConversations() {
    const conversations = await this.prisma.conversation.findMany({
      // hiddenBySeller: false — тикеты, которые админ убрал из своего
      // инбокса кнопкой "Удалить чат" (см. hideConversation), сюда не
      // попадают. Поле общее на всех админов (как и sellerLastReadAt чуть
      // ниже) — сейчас админ один, различать их не нужно.
      where: { type: ConversationType.SUPPORT, hiddenBySeller: false },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        buyer: { select: { id: true, displayName: true, picture: true } },
        guest: { select: { id: true, createdAt: true, blockedAt: true } },
        // deletedAt: null — иначе удалённое сообщение продолжало бы
        // висеть превью последнего сообщения в списке тикетов даже после
        // того, как пропало из самого треда (см. deleteMessage/getMessages).
        messages: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' }, take: 1 }
      }
    })

    return conversations.map(conversation => {
      const lastMessage = conversation.messages[0] ?? null

      // "От админа" — сообщение с senderId, который НЕ совпадает с
      // buyerId этого диалога (у гостевых диалогов buyerId всегда null,
      // так что любой senderId там автоматически "не гость", то есть
      // админ; у диалогов залогиненного участника senderId совпадает с
      // buyerId ровно когда пишет сам участник). Своё же сообщение админ
      // не может "не прочитать".
      const lastMessageFromAdmin =
        !!lastMessage && lastMessage.senderId !== null && lastMessage.senderId !== conversation.buyerId

      return {
        id: conversation.id,
        participant: conversation.buyer
          ? { type: 'user' as const, ...conversation.buyer }
          : { type: 'guest' as const, ...conversation.guest! },
        lastMessage,
        // sellerLastReadAt переиспользован как "когда админ (любой) в
        // последний раз открывал/отвечал в этот тикет" — общий на всех
        // админов курсор, а не персональный на каждого (см. комментарий к
        // type в schema.prisma: пока админ один, различать их для этого не
        // нужно).
        isUnread:
          !!lastMessage &&
          !lastMessageFromAdmin &&
          (!conversation.sellerLastReadAt || lastMessage.createdAt > conversation.sellerLastReadAt),
        updatedAt: conversation.lastMessageAt ?? conversation.createdAt
      }
    })
  }

  async getAdminMessages(conversationId: string, query: FindMessagesQueryDto) {
    await this.getSupportConversationOrThrow(conversationId)

    return this.getMessages(conversationId, query)
  }

  async sendAdminMessage(conversationId: string, admin: { id: string }, text: string) {
    const conversation = await this.getSupportConversationOrThrow(conversationId)

    // notifyDescription: null — ответ админа никогда не должен слать письмо
    // самому же админу. Физически это и не может оказаться "первым
    // сообщением тикета" в нормальном сценарии (тикет создаётся вместе с
    // первым сообщением посетителя, см. sendMyMessage), но на случай
    // гонки/ручного вмешательства в базу — явный null надёжнее, чем
    // полагаться на то, что isFirstMessage сам никогда не окажется true
    // здесь.
    const message = await this.createMessage(conversation, { type: 'user', userId: admin.id }, text, {
      notifyDescription: null
    })

    // Ответ = админ увидел тикет, даже если отдельно markAdminConversationRead
    // не вызывался (например, ответили сразу из инбокса, не открывая тред).
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { sellerLastReadAt: new Date() }
    })

    return message
  }

  async markAdminConversationRead(conversationId: string) {
    await this.getSupportConversationOrThrow(conversationId)

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { sellerLastReadAt: new Date() }
    })
  }

  async blockGuest(guestId: string) {
    await this.supportGuestsService.block(guestId)
  }

  async unblockGuest(guestId: string) {
    await this.supportGuestsService.unblock(guestId)
  }

  // Модераторское удаление: только админ, и админ может удалить ЛЮБОЕ
  // сообщение тикета — своё или собеседника (в отличие от "скрыть у себя"
  // на уровне Conversation.hiddenByBuyer/hiddenBySeller, см. schema.prisma —
  // там у каждой стороны своя видимость, тут одно действие убирает
  // сообщение из выдачи ОБЕИХ сторон, потому что источник этого решения —
  // не сам участник, а модератор). Soft-delete — строка остаётся в базе.
  async deleteMessage(conversationId: string, messageId: string) {
    const conversation = await this.getSupportConversationOrThrow(conversationId)

    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId, deletedAt: null }
    })

    if (!message) {
      throw new NotFoundException('Сообщение не найдено')
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date() }
    })

    this.eventEmitter.emit(SUPPORT_MESSAGE_DELETED_EVENT, {
      conversation,
      messageId
    } satisfies SupportMessageDeletedPayload)
  }

  // "Удалить всё" — та же модераторская логика, что и у deleteMessage
  // (только админ, стирает у обеих сторон), просто одним запросом на весь
  // тикет разом, а не по одному сообщению. updateMany молча не находит
  // ничего, если сообщений и так не было (или все уже удалены) — это не
  // ошибка, событие всё равно шлём, чтобы у фронта кэш точно оказался
  // пустым, даже если он почему-то расходится с базой.
  async deleteAllMessages(conversationId: string) {
    const conversation = await this.getSupportConversationOrThrow(conversationId)

    await this.prisma.message.updateMany({
      where: { conversationId, deletedAt: null },
      data: { deletedAt: new Date() }
    })

    this.eventEmitter.emit(SUPPORT_CONVERSATION_CLEARED_EVENT, {
      conversation
    } satisfies SupportConversationClearedPayload)
  }

  // "Удалить чат" — НЕ то же самое, что deleteAllMessages выше: та кнопка
  // чистит содержимое для ОБЕИХ сторон и живёт в самом треде, эта же —
  // чисто уборка списка, переписка участника не трогается вообще. Тот же
  // принцип, что уже есть у AD-диалогов (см. ConversationsService.
  // deleteConversation и комментарий к hiddenByBuyer/hiddenBySeller в
  // schema.prisma) — переиспользуем то же поле hiddenBySeller: у SUPPORT
  // sellerId всегда null (отвечает любой ADMIN), но сам булев флаг от
  // sellerId не зависит. Как и там — не физическое удаление: если участник
  // напишет снова, тикет должен вернуться (см. createMessage ниже), а не
  // потеряться для админа навсегда.
  async hideConversation(conversationId: string) {
    const conversation = await this.getSupportConversationOrThrow(conversationId)

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { hiddenBySeller: true }
    })

    this.eventEmitter.emit(SUPPORT_CONVERSATION_HIDDEN_EVENT, {
      conversation
    } satisfies SupportConversationHiddenPayload)
  }

  // --- Внутреннее ---

  private participantWhere(participant: SupportParticipant): Prisma.ConversationWhereInput {
    return participant.type === 'user'
      ? { buyerId: participant.user.id, type: ConversationType.SUPPORT }
      : { guestId: participant.guest.id, type: ConversationType.SUPPORT }
  }

  private async getOrCreateConversation(participant: SupportParticipant) {
    const existing = await this.prisma.conversation.findFirst({ where: this.participantWhere(participant) })

    if (existing) return existing

    try {
      return await this.prisma.conversation.create({
        data: {
          type: ConversationType.SUPPORT,
          ...(participant.type === 'user' ? { buyerId: participant.user.id } : { guestId: participant.guest.id })
        }
      })
    } catch (error) {
      // Гонка: два параллельных запроса одного и того же участника (двойной
      // клик, повторная отправка формы) — вторая попытка create упадёт на
      // partial unique index (conversation_support_buyer_unique /
      // conversation_support_guest_unique), это ожидаемо, а не поломка;
      // просто читаем то, что успел создать первый запрос.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const conversation = await this.prisma.conversation.findFirst({ where: this.participantWhere(participant) })
        if (conversation) return conversation
      }
      throw error
    }
  }

  private async getSupportConversationOrThrow(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } })

    if (!conversation || conversation.type !== ConversationType.SUPPORT) {
      throw new NotFoundException('Диалог не найден')
    }

    return conversation
  }

  private toSender(participant: SupportParticipant): MessageSender {
    return participant.type === 'user'
      ? { type: 'user', userId: participant.user.id }
      : { type: 'guest', guestId: participant.guest.id }
  }

  private async createMessage(
    conversation: Conversation,
    sender: MessageSender,
    text: string,
    { notifyDescription }: { notifyDescription: string | null }
  ) {
    // lastMessageAt ещё не обновлён на момент этой проверки — null значит,
    // что в диалоге вообще не было сообщений, то есть это первое обращение
    // и как раз тот случай, когда нужно письмо на почту (см. обсуждение с
    // пользователем: письмо только на первое сообщение, не на каждое).
    const isFirstMessage = conversation.lastMessageAt === null

    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          text,
          ...(sender.type === 'user' ? { senderId: sender.userId } : { senderGuestId: sender.guestId })
        }
      }),
      // hiddenBySeller: false — сбрасываем скрытие при ЛЮБОМ новом
      // сообщении в тикете (и от участника, и от ответа самого админа), не
      // только у получателя: тот же принцип, что и в ConversationsService.
      // createMessage у AD-диалогов — тикет, по которому снова идёт живая
      // переписка, не должен оставаться потерянным для админа из-за того,
      // что кто-то раньше нажал "Удалить чат".
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date(), hiddenBySeller: false }
      })
    ])

    this.eventEmitter.emit(SUPPORT_MESSAGE_CREATED_EVENT, {
      conversation,
      message,
      isFromAdmin: notifyDescription === null
    } satisfies SupportMessageCreatedPayload)

    if (isFirstMessage && notifyDescription !== null) {
      // Не блокируем ответ отправителю ошибкой почтового провайдера —
      // письмо на первое сообщение важно, но не важнее самого факта, что
      // сообщение долетело и сохранилось.
      void this.mailService.sendSupportMessageNotification(notifyDescription, text).catch(err => {
        console.error('❌ Не удалось отправить уведомление о новом обращении в поддержку:', err)
      })
    }

    return message
  }

  private describeParticipant(participant: SupportParticipant) {
    if (participant.type === 'user') {
      return participant.user.displayName || participant.user.email || `Пользователь ${participant.user.id}`
    }

    return `Гость (${participant.guest.id.slice(0, 8)})`
  }

  private async getMessages(conversationId: string, query: FindMessagesQueryDto) {
    const limit = query.limit ?? 30

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(query.cursor && { createdAt: { lt: new Date(query.cursor) } })
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return messages.reverse()
  }
}
