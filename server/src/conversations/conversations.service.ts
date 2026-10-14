import { EventEmitter2 } from '@nestjs/event-emitter'
import 'multer'
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { AdStatus, ConversationType } from '@/generated/prisma/enums'
import type { Message } from '@/generated/prisma/client'

import { BlockedUsersService } from '@/blocked-users/blocked-users.service'
import { FileService } from '@/file/file.service'
import { NotificationsService } from '@/notifications/notifications.service'
import { PrismaService } from '@/prisma/prisma.service'

import {
  CONVERSATION_MESSAGE_CREATED_EVENT,
  CONVERSATION_READ_EVENT,
  CONVERSATION_REMOVED_EVENT,
  ConversationMessageCreatedPayload,
  ConversationUserPayload
} from './conversations.events'
import { FindMessagesQueryDto } from './dto/find-messages-query.dto'
import { SendMessageDto } from './dto/send-message.dto'
import { StartConversationDto } from './dto/start-conversation.dto'

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockedUsersService: BlockedUsersService,
    private readonly notificationsService: NotificationsService,
    private readonly fileService: FileService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  // Начать диалог с продавцом объявления. Всегда вызывается покупателем —
  // sellerId берём из самого объявления, а не из тела запроса, чтобы нельзя
  // было подменить продавца. Повторное обращение того же покупателя к тому
  // же объявлению не плодит новый диалог (см. @@unique([adId, buyerId]) в
  // схеме) — upsert просто найдёт существующий и добавит туда сообщение.
  async startConversation(userId: string, dto: StartConversationDto, files: Express.Multer.File[] = []) {
    const text = this.requireContent(dto.text, files)
    const ad = await this.prisma.ad.findUnique({
      where: { id: dto.adId },
      select: { id: true, userId: true, title: true }
    })

    if (!ad) {
      throw new NotFoundException('Объявление не найдено')
    }

    if (ad.userId === userId) {
      throw new BadRequestException('Нельзя написать самому себе')
    }

    // Сообщение об ошибке намеренно нейтральное, без слова "заблокировал" —
    // не сообщаем прямо, что именно произошла блокировка (см. обсуждение UX
    // блокировки), чтобы не провоцировать конфликт в интерфейсе.
    if (await this.blockedUsersService.isBlocked(userId, ad.userId)) {
      throw new ForbiddenException('Не удалось отправить сообщение')
    }

    // Фото грузятся до создания диалога: если загрузка не удалась, пустого
    // диалога без сообщения не появится.
    const { conversation, message } = await this.withUploadedPhotos(files, async attachments => {
      const conversation = await this.prisma.conversation.upsert({
        where: { adId_buyerId: { adId: dto.adId, buyerId: userId } },
        update: {},
        // adTitleSnapshot — на случай, если объявление позже будет физически
        // удалено (Conversation.adId тогда обнулится, см. schema.prisma), чтобы
        // в списке диалогов не было пустоты (см. getConversations ниже).
        create: { adId: dto.adId, buyerId: userId, sellerId: ad.userId, adTitleSnapshot: ad.title }
      })

      return { conversation, message: await this.saveMessage(conversation.id, userId, text, attachments) }
    })

    await this.publishMessage(message, ad.userId, ad.title)

    return { conversation, message }
  }

  async sendMessage(conversationId: string, userId: string, dto: SendMessageDto, files: Express.Multer.File[] = []) {
    const text = this.requireContent(dto.text, files)
    const conversation = await this.getConversationForParticipant(conversationId, userId)
    // buyerId/sellerId — String? на уровне колонки (см. schema.prisma:
    // SUPPORT-диалоги их не заполняют), но getConversationForParticipant
    // уже отсеял всё, кроме type: AD, а для AD оба поля обязательны —
    // гарантирует CHECK-constraint conversation_participant_check.
    const counterpartId = (conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId)!

    if (await this.blockedUsersService.isBlocked(userId, counterpartId)) {
      throw new ForbiddenException('Не удалось отправить сообщение')
    }

    const message = await this.withUploadedPhotos(files, attachments =>
      this.saveMessage(conversationId, userId, text, attachments)
    )

    await this.publishMessage(message, counterpartId, conversation.adTitleSnapshot ?? '')

    return message
  }

  // Список диалогов текущего юзера — и как покупателя, и как продавца
  // сразу, отсортированный по свежести последнего сообщения. Для каждого
  // диалога отдаём "собеседника" (не "юзер А и юзер Б", а именно того, кто
  // не текущий юзер) и посчитанный на лету isUnread — сравнением времени
  // последнего сообщения с курсором прочтения текущего юзера, без отдельной
  // таблицы статусов (см. комментарий к модели Conversation в schema.prisma).
  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      // hiddenBy* — диалог, который этот юзер у себя "удалил" (см. комментарий
      // в schema.prisma), просто не попадает в список; для второго участника
      // условие на его собственный флаг не срабатывает, и у него диалог
      // остаётся видимым как ни в чём не бывало.
      //
      // type: AD — без этого фильтра первая ветка OR (buyerId: userId) задела
      // бы и SUPPORT-тикет этого же юзера (см. schema.prisma): у него тоже
      // buyerId === userId. Переписка с поддержкой — отдельный виджет
      // (SupportChatWidget), в общий список "Мои сообщения" попадать не
      // должна.
      where: {
        type: ConversationType.AD,
        OR: [
          { buyerId: userId, hiddenByBuyer: false },
          { sellerId: userId, hiddenBySeller: false }
        ]
      },
      orderBy: [{ lastMessageAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        ad: { select: { id: true, title: true, images: true, slug: true, status: true } },
        buyer: { select: { id: true, displayName: true, picture: true, deletedAt: true } },
        seller: { select: { id: true, displayName: true, picture: true, deletedAt: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    })

    return conversations.map(conversation => {
      const isBuyer = conversation.buyerId === userId
      const counterpart = isBuyer ? conversation.seller : conversation.buyer
      const lastReadAt = isBuyer ? conversation.buyerLastReadAt : conversation.sellerLastReadAt
      const lastMessage = conversation.messages[0] ?? null

      // Объявление считаем "доступным" по ссылке, только пока оно реально
      // открывается публично (status PUBLISHED) — так же строго, как это уже
      // проверяет AdsService.findOne. Архивированное объявление 404-ится там
      // мгновенно, в момент архивации, а не через 30 дней при физическом
      // удалении (см. AdsArchivePurgeWorker) — так что отдавать живую
      // ссылку на него нельзя, даже пока строка Ad ещё существует в базе.
      // В обоих случаях (архивировано или уже физически удалено — тогда
      // conversation.ad вообще null, см. onDelete: SetNull в schema.prisma)
      // отдаём id: null, а заголовок берём из живых данных, если строка ещё
      // есть, иначе — из снепшота, снятого при создании диалога.
      const ad = conversation.ad

      return {
        id: conversation.id,
        ad:
          ad && ad.status === AdStatus.PUBLISHED
            ? { id: ad.id, title: ad.title, images: ad.images, slug: ad.slug }
            : {
                id: null,
                title: ad?.title ?? conversation.adTitleSnapshot ?? 'Объявление удалено',
                images: ad?.images ?? [],
                slug: null
              },
        counterpart,
        lastMessage,
        dealConfirmed: conversation.dealConfirmed,
        // Своё же сообщение не считается непрочитанным.
        isUnread:
          !!lastMessage && lastMessage.senderId !== userId && (!lastReadAt || lastMessage.createdAt > lastReadAt),
        updatedAt: conversation.lastMessageAt ?? conversation.createdAt
      }
    })
  }

  async getMessages(conversationId: string, userId: string, query: FindMessagesQueryDto) {
    await this.getConversationForParticipant(conversationId, userId)

    const limit = query.limit ?? 30

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...(query.cursor && { createdAt: { lt: new Date(query.cursor) } })
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Из базы читаем от новых к старым (удобно для LIMIT), а отдаём в
    // хронологическом порядке — фронту так проще рендерить список сверху вниз.
    return messages.reverse()
  }

  async markRead(conversationId: string, userId: string) {
    const conversation = await this.getConversationForParticipant(conversationId, userId)
    const isBuyer = conversation.buyerId === userId

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: isBuyer ? { buyerLastReadAt: new Date() } : { sellerLastReadAt: new Date() }
    })

    this.eventEmitter.emit(CONVERSATION_READ_EVENT, { conversationId, userId } satisfies ConversationUserPayload)
  }

  // "Удаление" диалога — по умолчанию скрывает его только у того, кто нажал
  // удалить (см. комментарий к hiddenByBuyer/hiddenBySeller в schema.prisma):
  // переписка принадлежит обоим участникам, физически стереть её по воле
  // одного было бы нечестно ко второму. НО если собеседник уже удалил свой
  // аккаунт (deletedAt) — это правило больше не применимо: второй стороне
  // терять нечего, зайти в диалог она физически не может (AuthGuard
  // отклоняет юзеров с deletedAt), так что оставшийся живой участник —
  // единственный реальный владелец записи, и ему отдаём настоящее,
  // необратимое удаление (Message уйдёт каскадом, см. Message.conversation
  // onDelete: Cascade).
  async deleteConversation(conversationId: string, userId: string) {
    // findFirst, а не findUnique — нужен доп. фильтр type: AD (см.
    // getConversations выше: SUPPORT-тикет к этому эндпоинту отношения не
    // имеет, у него и удалять через него нечего).
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, type: ConversationType.AD },
      select: {
        buyerId: true,
        sellerId: true,
        buyer: { select: { deletedAt: true } },
        seller: { select: { deletedAt: true } }
      }
    })

    if (!conversation) {
      throw new NotFoundException('Диалог не найден')
    }

    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      throw new ForbiddenException('Это не ваш диалог')
    }

    const isBuyer = conversation.buyerId === userId
    // buyer/seller — User? на уровне типа (колонка nullable ради SUPPORT),
    // но выше уже отфильтровано type: AD, а там оба участника обязательны
    // (CHECK-constraint conversation_participant_check).
    const counterpart = (isBuyer ? conversation.seller : conversation.buyer)!

    if (counterpart.deletedAt) {
      // Фото сообщений удаляются из S3 вместе с перепиской — после записи в БД:
      // если она откажет, диалог останется со всеми фото.
      const photos = await this.prisma.message.findMany({
        where: { conversationId, attachments: { isEmpty: false } },
        select: { attachments: true }
      })

      await this.prisma.conversation.delete({ where: { id: conversationId } })
      await this.fileService.deleteFilesQuietly(photos.flatMap(message => message.attachments))
    } else {
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: isBuyer ? { hiddenByBuyer: true } : { hiddenBySeller: true }
      })
    }

    this.eventEmitter.emit(CONVERSATION_REMOVED_EVENT, { conversationId, userId } satisfies ConversationUserPayload)
  }

  // Сообщение должно содержать текст или хотя бы одно фото.
  private requireContent(text: string | undefined, files: Express.Multer.File[]) {
    const value = text ?? ''

    if (!value.trim() && files.length === 0) {
      throw new BadRequestException('Сообщение не может быть пустым')
    }

    return value
  }

  // Загружает фото и передаёт ссылки в action, который сохраняет их в БД. Если
  // сохранение не удалось, загруженные фото удаляются — иначе они остались бы
  // в S3 без ссылки из БД.
  private async withUploadedPhotos<T>(
    files: Express.Multer.File[],
    action: (attachments: string[]) => Promise<T>
  ): Promise<T> {
    const attachments = await this.fileService.uploadChatPhotos(files)

    try {
      return await action(attachments)
    } catch (error) {
      await this.fileService.deleteFilesQuietly(attachments)

      throw error
    }
  }

  private async saveMessage(conversationId: string, senderId: string, text: string, attachments: string[]) {
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({ data: { conversationId, senderId, text, attachments } }),
      // Сбрасываем скрытие с обеих сторон при любом новом сообщении — не
      // только у получателя (которому логично снова увидеть диалог, раз ему
      // пишут), но и у самого отправителя: если он писал через "Написать" на
      // странице объявления в диалог, который сам же раньше скрыл, он должен
      // увидеть в списке своё же новое сообщение, а не потерять его.
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date(), hiddenByBuyer: false, hiddenBySeller: false }
      })
    ])

    return message
  }

  // Что происходит после сохранения сообщения: живая доставка и уведомление.
  private async publishMessage(message: Message, recipientId: string, adTitle: string) {
    // senderId у сообщений этого сервиса всегда есть (гостевые — только в
    // SUPPORT), тип Message его лишь допускает пустым.
    const senderId = message.senderId!

    // Живая доставка обоим участникам (получателю и другим устройствам
    // отправителя) — рассылает ConversationsGateway.
    this.eventEmitter.emit(CONVERSATION_MESSAGE_CREATED_EVENT, {
      message,
      participantIds: [senderId, recipientId]
    } satisfies ConversationMessageCreatedPayload)

    // Уведомление получателю о новом сообщении — best-effort: провал не
    // должен ронять отправку самого сообщения. Здесь (в отличие от
    // AdsService.reject/NotificationsService.notifyAdRejected, где в
    // try/catch обёрнута только email-часть) в try/catch весь блок целиком —
    // этот метод вызывается на порядки чаще, и создание самой записи Message
    // не должно зависеть от доступности уведомлений.
    try {
      const sender = await this.prisma.user.findUnique({ where: { id: senderId }, select: { displayName: true } })
      await this.notificationsService.notifyNewMessage(
        recipientId,
        message.conversationId,
        adTitle,
        sender?.displayName ?? 'Пользователь',
        // Сообщение только с фото: в превью уведомления вместо пустого текста.
        message.text.trim() || (message.attachments.length ? 'Фото' : '')
      )
    } catch (error) {
      this.logger.error(`Не удалось отправить уведомление о новом сообщении: ${(error as Error).message}`)
    }
  }

  private async getConversationForParticipant(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({ where: { id: conversationId } })

    // type: AD — этот сервис целиком про диалоги по объявлениям; SUPPORT
    // живёт в отдельном SupportService со своей авторизацией (гость/юзер/
    // ADMIN, см. support/), сюда попадать не должен, даже если id диалога
    // как-то узнали и подставили в этот эндпоинт напрямую.
    if (!conversation || conversation.type !== ConversationType.AD) {
      throw new NotFoundException('Диалог не найден')
    }

    if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
      throw new ForbiddenException('Это не ваш диалог')
    }

    return conversation
  }
}
