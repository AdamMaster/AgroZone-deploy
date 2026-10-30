import { EventEmitter2 } from '@nestjs/event-emitter'
import 'multer'
import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { AdStatus, ConversationType, SellerReviewContactType } from '@/generated/prisma/enums'
import type { Message, Prisma } from '@/generated/prisma/client'

import { BlockedUsersService } from '@/blocked-users/blocked-users.service'
import { FileService } from '@/file/file.service'
import { NotificationsService } from '@/notifications/notifications.service'
import { PrismaService } from '@/prisma/prisma.service'
import { SiteSettingsService } from '@/site-settings/site-settings.service'

import {
  CONVERSATION_DEAL_CHANGED_EVENT,
  CONVERSATION_MESSAGE_CREATED_EVENT,
  CONVERSATION_READ_EVENT,
  CONVERSATION_REMOVED_EVENT,
  ConversationDealChangedPayload,
  ConversationMessageCreatedPayload,
  ConversationUserPayload
} from './conversations.events'
import { ChatEmailRemindersService } from './chat-email-reminders.service'
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
    private readonly chatEmailRemindersService: ChatEmailRemindersService,
    private readonly fileService: FileService,
    private readonly eventEmitter: EventEmitter2,
    private readonly siteSettingsService: SiteSettingsService
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
      select: { id: true, userId: true, title: true, status: true, user: { select: { deletedAt: true } } }
    })

    if (!ad) {
      throw new NotFoundException('Объявление не найдено')
    }

    if (ad.userId === userId) {
      throw new BadRequestException('Нельзя написать самому себе')
    }

    // Писать можно только по объявлению, которое сейчас открыто на сайте: по
    // снятому, отклонённому, архивному или удалённого продавца ответа не будет
    // (в интерфейсе кнопки нет, но API должен отказывать сам). Отказ тот же,
    // что и для несуществующего, — не раскрываем статус чужого объявления.
    if (ad.status !== AdStatus.PUBLISHED || !ad.user || ad.user.deletedAt) {
      throw new NotFoundException('Объявление не найдено')
    }

    // Сообщение об ошибке намеренно нейтральное, без слова "заблокировал" —
    // не сообщаем прямо, что именно произошла блокировка (см. обсуждение UX
    // блокировки), чтобы не провоцировать конфликт в интерфейсе.
    if (await this.blockedUsersService.isBlocked(userId, ad.userId)) {
      throw new ForbiddenException('Не удалось отправить сообщение')
    }

    // Фото грузятся до создания диалога: если загрузка не удалась, пустого
    // диалога без сообщения не появится.
    // Диалог и первое сообщение — одной транзакцией: если сообщение не
    // сохранится, пустого диалога в списке не останется.
    const { conversation, message } = await this.withUploadedPhotos(files, attachments =>
      this.prisma.$transaction(async tx => {
        const conversation = await tx.conversation.upsert({
          where: { adId_buyerId: { adId: dto.adId, buyerId: userId } },
          update: {},
          // adTitleSnapshot — на случай, если объявление позже будет физически
          // удалено (Conversation.adId тогда обнулится, см. schema.prisma), чтобы
          // в списке диалогов не было пустоты (см. getConversations ниже).
          create: { adId: dto.adId, buyerId: userId, sellerId: ad.userId, adTitleSnapshot: ad.title }
        })

        return { conversation, message: await this.saveMessage(tx, conversation.id, userId, text, attachments) }
      })
    )

    await this.publishMessage(message, ad.userId)

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

    // Собеседник удалил аккаунт: прочитать сообщение некому, а отправитель
    // не должен думать, что ему ответят. История остаётся доступной.
    const counterpart = await this.prisma.user.findUnique({ where: { id: counterpartId }, select: { deletedAt: true } })

    if (!counterpart || counterpart.deletedAt) {
      throw new BadRequestException('Собеседник удалил аккаунт — написать ему больше нельзя')
    }

    const message = await this.withUploadedPhotos(files, attachments =>
      this.prisma.$transaction(tx => this.saveMessage(tx, conversationId, userId, text, attachments))
    )

    await this.publishMessage(message, counterpartId)

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

    const repliedConversationIds = await this.findRepliedAsSeller(
      userId,
      conversations.filter(conversation => conversation.sellerId === userId).map(conversation => conversation.id)
    )

    const unreadCounts = await this.countUnreadMessages(userId, conversations)

    return conversations.map(conversation => {
      const isBuyer = conversation.buyerId === userId
      const counterpart = isBuyer ? conversation.seller : conversation.buyer
      const lastReadAt = isBuyer ? conversation.buyerLastReadAt : conversation.sellerLastReadAt
      const clearedAt = isBuyer ? conversation.buyerClearedAt : conversation.sellerClearedAt
      const latestMessage = conversation.messages[0] ?? null
      // Сообщения до «Удалить переписку» этому участнику не показываются —
      // ни в диалоге, ни в превью списка.
      const lastMessage = latestMessage && (!clearedAt || latestMessage.createdAt > clearedAt) ? latestMessage : null

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
      // Своё же сообщение не считается непрочитанным.
      const isUnread =
        !!lastMessage && lastMessage.senderId !== userId && (!lastReadAt || lastMessage.createdAt > lastReadAt)

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
        // Нужны клиенту, чтобы показать продавцу кнопку «Сделка состоялась», а
        // покупателю — отметку продавца (см. setDealConfirmed).
        // canConfirmDeal — то же условие, что проверяет сервер при отметке:
        // клиент не дублирует правило, а только показывает его результат.
        isSeller: !isBuyer,
        canConfirmDeal: repliedConversationIds.has(conversation.id),
        dealConfirmedAt: conversation.dealConfirmedAt,
        isUnread,
        // Сколько сообщений собеседника ещё не прочитано — число в кружке
        // у диалога. Согласовано с isUnread: непрочитанный диалог — минимум 1
        // (например, если последнее сообщение пришло, пока считали), а
        // прочитанный — всегда 0.
        unreadCount: isUnread ? Math.max(unreadCounts.get(conversation.id) ?? 0, 1) : 0,
        updatedAt: conversation.lastMessageAt ?? conversation.createdAt
      }
    })
  }

  async getMessages(conversationId: string, userId: string, query: FindMessagesQueryDto) {
    const conversation = await this.getConversationForParticipant(conversationId, userId)

    const limit = query.limit ?? 30
    // Если участник «удалял переписку», его история начинается после этой
    // отметки (см. Conversation.buyerClearedAt).
    const clearedAt = conversation.buyerId === userId ? conversation.buyerClearedAt : conversation.sellerClearedAt

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        ...((clearedAt || query.cursor) && {
          createdAt: {
            ...(clearedAt && { gt: clearedAt }),
            ...(query.cursor && { lt: new Date(query.cursor) })
          }
        })
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

  // Непрочитанные сообщения собеседника по каждому диалогу списка — одним
  // запросом, а не по запросу на диалог. Непрочитанное — всё новее курсора
  // прочтения и новее «Удалить переписку» (удалённое участнику не показывается
  // и числиться непрочитанным не может). Диалог без единого курсора считается
  // прочитанным с нуля, то есть учитываются все сообщения собеседника.
  private async countUnreadMessages(
    userId: string,
    conversations: Array<{
      id: string
      buyerId: string | null
      buyerLastReadAt: Date | null
      sellerLastReadAt: Date | null
      buyerClearedAt: Date | null
      sellerClearedAt: Date | null
    }>
  ): Promise<Map<string, number>> {
    if (conversations.length === 0) return new Map()

    const rows = await this.prisma.message.groupBy({
      by: ['conversationId'],
      where: {
        deletedAt: null,
        senderId: { not: userId },
        OR: conversations.map(conversation => {
          const isBuyer = conversation.buyerId === userId
          const lastReadAt = isBuyer ? conversation.buyerLastReadAt : conversation.sellerLastReadAt
          const clearedAt = isBuyer ? conversation.buyerClearedAt : conversation.sellerClearedAt
          const since = [lastReadAt, clearedAt].reduce<Date | null>(
            (latest, date) => (date && (!latest || date > latest) ? date : latest),
            null
          )

          return { conversationId: conversation.id, ...(since && { createdAt: { gt: since } }) }
        })
      },
      _count: { _all: true }
    })

    return new Map(rows.map(row => [row.conversationId, row._count._all]))
  }

  // Из переданных диалогов, где пользователь продавец, — те, где он сам хоть
  // раз написал. Одним запросом на весь список, а не по запросу на диалог.
  private async findRepliedAsSeller(sellerId: string, conversationIds: string[]): Promise<Set<string>> {
    if (conversationIds.length === 0) return new Set()

    const replies = await this.prisma.message.findMany({
      where: { conversationId: { in: conversationIds }, senderId: sellerId },
      distinct: ['conversationId'],
      select: { conversationId: true }
    })

    return new Set(replies.map(reply => reply.conversationId))
  }

  // Меняет отметку и читает итог в одной транзакции вместе с проверкой
  // отзывов. UPDATE берёт блокировку строки диалога, а создание отзыва с
  // подтверждением сделки берёт на ту же строку FOR SHARE (см.
  // SellerReviewsService.create): отзыв и отмена сделки не могут разминуться —
  // что бы ни началось раньше, второе увидит результат первого.
  // Отзыв с «подтверждённой сделкой» держится на этой отметке: снять её
  // задним числом значило бы оставить отзыв без основания.
  private writeDealState(conversationId: string, confirmed: boolean) {
    return this.prisma.$transaction(async tx => {
      // Условие в самом UPDATE, а не проверка по уже прочитанной строке: два
      // одновременных запроса не затрут друг друга и не разошлют событие дважды.
      const { count } = await tx.conversation.updateMany({
        where: { id: conversationId, dealConfirmedAt: confirmed ? null : { not: null } },
        data: { dealConfirmedAt: confirmed ? new Date() : null }
      })

      if (!confirmed && count > 0) {
        const review = await tx.sellerReview.findFirst({
          where: { conversationId, contactType: SellerReviewContactType.DEAL_CONFIRMED },
          select: { id: true }
        })

        if (review) {
          throw new BadRequestException('Отменить нельзя: по этой сделке уже оставлен отзыв')
        }
      }

      const { dealConfirmedAt } = await tx.conversation.findUniqueOrThrow({
        where: { id: conversationId },
        select: { dealConfirmedAt: true }
      })

      return { count, dealConfirmedAt }
    })
  }

  // Продавец отмечает, что сделка с покупателем этого диалога состоялась,
  // или снимает отметку. Покупатель отметить себя не может — иначе
  // подтверждение ничего бы не подтверждало (см. dealConfirmedAt в
  // schema.prisma). Отметить можно только после того, как продавец сам
  // ответил в диалоге: иначе одно «привет» со второго аккаунта давало бы
  // «подтверждённую сделку» и отзыв с полным весом. Первое сообщение в
  // диалоге всегда от покупателя (см. startConversation), поэтому
  // проверять нужно только ответ продавца. Снять отметку можно, пока по
  // сделке нет отзыва с подтверждением (см. SellerReview).
  // Повтор с тем же значением — не изменение: время первой отметки
  // сохраняется, событие участникам не рассылается.
  async setDealConfirmed(conversationId: string, userId: string, confirmed: boolean) {
    const conversation = await this.getConversationForParticipant(conversationId, userId)

    if (conversation.sellerId !== userId) {
      throw new ForbiddenException('Отметить сделку состоявшейся может только продавец')
    }

    if (confirmed && (await this.findRepliedAsSeller(userId, [conversationId])).size === 0) {
      throw new BadRequestException('Сначала ответьте покупателю в этом диалоге')
    }

    const { count, dealConfirmedAt } = await this.writeDealState(conversationId, confirmed)

    if (count > 0) {
      // buyerId/sellerId у диалога по объявлению обязательны (см.
      // getConversationForParticipant).
      this.eventEmitter.emit(CONVERSATION_DEAL_CHANGED_EVENT, {
        conversationId,
        dealConfirmedAt,
        participantIds: [conversation.buyerId!, conversation.sellerId]
      } satisfies ConversationDealChangedPayload)

      if (confirmed) {
        await this.inviteBuyerToReview(conversation.buyerId!, conversationId)
      }
    }

    return { dealConfirmedAt }
  }

  // Покупателю приходит приглашение оценить продавца — только пока рейтинги
  // включены (иначе приглашать не к чему). Best-effort: сбой уведомления не
  // должен ронять саму отметку сделки.
  private async inviteBuyerToReview(buyerId: string, conversationId: string) {
    try {
      const { sellerRatings } = await this.siteSettingsService.getFlags()

      if (sellerRatings) {
        await this.notificationsService.notifyDealConfirmed(buyerId, conversationId)
      }
    } catch (error) {
      this.logger.error(`Не удалось отправить приглашение оценить продавца: ${(error as Error).message}`)
    }
  }

  // "Удаление" диалога — по умолчанию скрывает его только у того, кто нажал
  // удалить, и начинает его историю с чистого листа (см. комментарий к
  // hiddenByBuyer/hiddenBySeller и buyerClearedAt/sellerClearedAt в
  // schema.prisma):
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
        // Скрываем и «обнуляем» историю для удалившего: если собеседник
        // напишет снова, диалог вернётся, но старые сообщения — нет. У
        // собеседника переписка остаётся целиком.
        data: isBuyer
          ? { hiddenByBuyer: true, buyerClearedAt: new Date() }
          : { hiddenBySeller: true, sellerClearedAt: new Date() }
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

  // Сообщение и обновление диалога — в переданной транзакции: сообщение не
  // должно остаться без lastMessageAt и наоборот.
  private async saveMessage(
    tx: Prisma.TransactionClient,
    conversationId: string,
    senderId: string,
    text: string,
    attachments: string[]
  ) {
    const message = await tx.message.create({ data: { conversationId, senderId, text, attachments } })

    // Сбрасываем скрытие с обеих сторон при любом новом сообщении — не
    // только у получателя (которому логично снова увидеть диалог, раз ему
    // пишут), но и у самого отправителя: если он писал через "Написать" на
    // странице объявления в диалог, который сам же раньше скрыл, он должен
    // увидеть в списке своё же новое сообщение, а не потерять его.
    await tx.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), hiddenByBuyer: false, hiddenBySeller: false }
    })

    return message
  }

  // Что происходит после сохранения сообщения: живая доставка и уведомление.
  private async publishMessage(message: Message, recipientId: string) {
    // senderId у сообщений этого сервиса всегда есть (гостевые — только в
    // SUPPORT), тип Message его лишь допускает пустым.
    const senderId = message.senderId!

    // Живая доставка обоим участникам (получателю и другим устройствам
    // отправителя) — рассылает ConversationsGateway.
    this.eventEmitter.emit(CONVERSATION_MESSAGE_CREATED_EVENT, {
      message,
      participantIds: [senderId, recipientId]
    } satisfies ConversationMessageCreatedPayload)

    // Письмо получателю — не сразу, а через CHAT_EMAIL_DELAY_MS и только если он
    // за это время сообщение так и не прочитал (см. ChatEmailRemindersService;
    // в список уведомлений письмо не попадает). Постановка напоминания не бросает:
    // создание самой записи Message от почты не зависит.
    await this.chatEmailRemindersService.scheduleForMessage(message, recipientId)
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
