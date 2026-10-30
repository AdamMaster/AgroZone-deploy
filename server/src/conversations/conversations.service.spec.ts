import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import type { EventEmitter2 } from '@nestjs/event-emitter'

import { FileService } from '@/file/file.service'
import { SiteSettingsService } from '@/site-settings/site-settings.service'
import { AdStatus, ConversationType, SellerReviewContactType } from '@/generated/prisma/enums'

import {
  CONVERSATION_DEAL_CHANGED_EVENT,
  CONVERSATION_MESSAGE_CREATED_EVENT,
  CONVERSATION_READ_EVENT,
  CONVERSATION_REMOVED_EVENT
} from './conversations.events'
import type { ChatEmailRemindersService } from './chat-email-reminders.service'
import { ConversationsService } from './conversations.service'

describe('ConversationsService: живые события', () => {
  let prisma: any
  let blockedUsersService: any
  let notificationsService: any
  let chatEmailRemindersService: { scheduleForMessage: jest.Mock }
  let siteSettingsService: { getFlags: jest.Mock }
  let fileService: { uploadChatPhotos: jest.Mock; deleteFilesQuietly: jest.Mock }
  let eventEmitter: { emit: jest.Mock }
  let service: ConversationsService

  const conversation = {
    id: 'c1',
    type: ConversationType.AD,
    buyerId: 'buyer',
    sellerId: 'seller',
    adTitleSnapshot: 'Трактор'
  }

  beforeEach(() => {
    const message = {
      id: 'm1',
      conversationId: 'c1',
      senderId: 'buyer',
      text: 'Привет',
      attachments: [],
      createdAt: new Date('2026-10-29T12:00:00.000Z')
    }

    prisma = {
      conversation: {
        upsert: jest.fn().mockResolvedValue(conversation),
        findUnique: jest.fn().mockResolvedValue(conversation),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ dealConfirmedAt: null }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn().mockResolvedValue({})
      },
      ad: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'ad1',
          userId: 'seller',
          title: 'Трактор',
          status: AdStatus.PUBLISHED,
          user: { deletedAt: null }
        })
      },
      sellerReview: { findFirst: jest.fn().mockResolvedValue(null) },
      message: {
        create: jest.fn().mockReturnValue(message),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0)
      },
      user: { findUnique: jest.fn().mockResolvedValue({ displayName: 'Иван', deletedAt: null }) },
      $transaction: jest.fn((arg: unknown) => (typeof arg === 'function' ? arg(prisma) : Promise.resolve([message])))
    }
    blockedUsersService = { isBlocked: jest.fn().mockResolvedValue(false) }
    notificationsService = {
      notifyDealConfirmed: jest.fn().mockResolvedValue(undefined)
    }
    chatEmailRemindersService = { scheduleForMessage: jest.fn().mockResolvedValue(undefined) }
    siteSettingsService = { getFlags: jest.fn().mockResolvedValue({ sellerRatings: true }) }
    fileService = {
      uploadChatPhotos: jest.fn().mockResolvedValue([]),
      deleteFilesQuietly: jest.fn().mockResolvedValue(undefined)
    }
    eventEmitter = { emit: jest.fn() }

    service = new ConversationsService(
      prisma,
      blockedUsersService,
      notificationsService,
      chatEmailRemindersService as unknown as ChatEmailRemindersService,
      fileService as unknown as FileService,
      eventEmitter as unknown as EventEmitter2,
      siteSettingsService as unknown as SiteSettingsService
    )
  })

  it('новое сообщение рассылается обоим участникам', async () => {
    const message = await service.sendMessage('c1', 'buyer', { text: 'Привет' })

    expect(eventEmitter.emit).toHaveBeenCalledWith(CONVERSATION_MESSAGE_CREATED_EVENT, {
      message,
      participantIds: ['buyer', 'seller']
    })
  })

  it('заблокированному отправка и рассылка запрещены', async () => {
    blockedUsersService.isBlocked.mockResolvedValue(true)

    await expect(service.sendMessage('c1', 'buyer', { text: 'Привет' })).rejects.toBeInstanceOf(ForbiddenException)
    expect(eventEmitter.emit).not.toHaveBeenCalled()
  })

  it('прочтение сообщает событие пользователю', async () => {
    await service.markRead('c1', 'seller')

    expect(eventEmitter.emit).toHaveBeenCalledWith(CONVERSATION_READ_EVENT, { conversationId: 'c1', userId: 'seller' })
  })

  it('скрытие диалога сообщает событие пользователю', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      buyerId: 'buyer',
      sellerId: 'seller',
      buyer: { deletedAt: null },
      seller: { deletedAt: null }
    })

    await service.deleteConversation('c1', 'buyer')

    expect(prisma.conversation.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { hiddenByBuyer: true, buyerClearedAt: expect.any(Date) }
    })
    expect(eventEmitter.emit).toHaveBeenCalledWith(CONVERSATION_REMOVED_EVENT, {
      conversationId: 'c1',
      userId: 'buyer'
    })
  })

  it('физическое удаление (собеседник удалил аккаунт) тоже сообщает событие', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      buyerId: 'buyer',
      sellerId: 'seller',
      buyer: { deletedAt: null },
      seller: { deletedAt: new Date() }
    })

    await service.deleteConversation('c1', 'buyer')

    expect(prisma.conversation.delete).toHaveBeenCalledWith({ where: { id: 'c1' } })
    expect(eventEmitter.emit).toHaveBeenCalledWith(CONVERSATION_REMOVED_EVENT, {
      conversationId: 'c1',
      userId: 'buyer'
    })
  })

  it('чужой диалог не удаляется и события нет', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      buyerId: 'buyer',
      sellerId: 'seller',
      buyer: { deletedAt: null },
      seller: { deletedAt: null }
    })

    await expect(service.deleteConversation('c1', 'stranger')).rejects.toBeInstanceOf(ForbiddenException)
    expect(eventEmitter.emit).not.toHaveBeenCalled()
  })

  describe('отметка «сделка состоялась»', () => {
    const CONFIRMED_AT = new Date('2026-10-26T12:00:00.000Z')

    // По умолчанию продавец в диалоге уже отвечал.
    beforeEach(() => {
      prisma.message.findMany.mockResolvedValue([{ conversationId: 'c1' }])
    })

    it('продавец отмечает сделку: условие «ещё не отмечена» зашито в UPDATE, участникам уходит событие', async () => {
      prisma.conversation.findUniqueOrThrow.mockResolvedValue({ dealConfirmedAt: CONFIRMED_AT })

      const result = await service.setDealConfirmed('c1', 'seller', true)

      expect(prisma.conversation.updateMany).toHaveBeenCalledWith({
        where: { id: 'c1', dealConfirmedAt: null },
        data: { dealConfirmedAt: expect.any(Date) }
      })
      expect(eventEmitter.emit).toHaveBeenCalledWith(CONVERSATION_DEAL_CHANGED_EVENT, {
        conversationId: 'c1',
        dealConfirmedAt: CONFIRMED_AT,
        participantIds: ['buyer', 'seller']
      })
      expect(result).toEqual({ dealConfirmedAt: CONFIRMED_AT })
    })

    it('сделка отмечена — покупателю уходит приглашение оценить продавца', async () => {
      await service.setDealConfirmed('c1', 'seller', true)

      expect(notificationsService.notifyDealConfirmed).toHaveBeenCalledWith('buyer', 'c1')
    })

    it('рейтинги выключены — приглашения нет', async () => {
      siteSettingsService.getFlags.mockResolvedValue({ sellerRatings: false })

      await service.setDealConfirmed('c1', 'seller', true)

      expect(notificationsService.notifyDealConfirmed).not.toHaveBeenCalled()
    })

    it('снятие отметки и повтор без изменения приглашений не шлют', async () => {
      await service.setDealConfirmed('c1', 'seller', false)

      prisma.conversation.updateMany.mockResolvedValue({ count: 0 })
      await service.setDealConfirmed('c1', 'seller', true)

      expect(notificationsService.notifyDealConfirmed).not.toHaveBeenCalled()
    })

    it('сбой приглашения не ломает отметку сделки', async () => {
      notificationsService.notifyDealConfirmed.mockRejectedValue(new Error('db down'))

      await expect(service.setDealConfirmed('c1', 'seller', true)).resolves.toBeDefined()
    })

    it('продавец снимает отметку: в UPDATE условие «уже отмечена», в событии null', async () => {
      const result = await service.setDealConfirmed('c1', 'seller', false)

      expect(prisma.conversation.updateMany).toHaveBeenCalledWith({
        where: { id: 'c1', dealConfirmedAt: { not: null } },
        data: { dealConfirmedAt: null }
      })
      expect(eventEmitter.emit).toHaveBeenCalledWith(CONVERSATION_DEAL_CHANGED_EVENT, {
        conversationId: 'c1',
        dealConfirmedAt: null,
        participantIds: ['buyer', 'seller']
      })
      expect(result).toEqual({ dealConfirmedAt: null })
    })

    it('повтор с тем же значением — не изменение: время первой отметки сохраняется, события нет', async () => {
      prisma.conversation.updateMany.mockResolvedValue({ count: 0 })
      prisma.conversation.findUniqueOrThrow.mockResolvedValue({ dealConfirmedAt: CONFIRMED_AT })

      await expect(service.setDealConfirmed('c1', 'seller', true)).resolves.toEqual({ dealConfirmedAt: CONFIRMED_AT })
      expect(eventEmitter.emit).not.toHaveBeenCalled()
    })

    it('пока продавец сам не написал в диалоге, отметить сделку нельзя — ответ ищется среди его сообщений', async () => {
      prisma.message.findMany.mockResolvedValue([])

      await expect(service.setDealConfirmed('c1', 'seller', true)).rejects.toBeInstanceOf(BadRequestException)

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { conversationId: { in: ['c1'] }, senderId: 'seller' },
        distinct: ['conversationId'],
        select: { conversationId: true }
      })
      expect(prisma.conversation.updateMany).not.toHaveBeenCalled()
      expect(eventEmitter.emit).not.toHaveBeenCalled()
    })

    it('отметку с оставленным отзывом снять нельзя: транзакция откатывается, события нет', async () => {
      prisma.sellerReview.findFirst.mockResolvedValue({ id: 'r1' })

      await expect(service.setDealConfirmed('c1', 'seller', false)).rejects.toBeInstanceOf(BadRequestException)

      expect(prisma.sellerReview.findFirst).toHaveBeenCalledWith({
        where: { conversationId: 'c1', contactType: SellerReviewContactType.DEAL_CONFIRMED },
        select: { id: true }
      })
      expect(eventEmitter.emit).not.toHaveBeenCalled()
    })

    it('снять отметку можно и без ответа продавца', async () => {
      prisma.message.findMany.mockResolvedValue([])

      await expect(service.setDealConfirmed('c1', 'seller', false)).resolves.toEqual({ dealConfirmedAt: null })
      expect(prisma.message.findMany).not.toHaveBeenCalled()
    })

    it('покупатель отметить сделку не может', async () => {
      await expect(service.setDealConfirmed('c1', 'buyer', true)).rejects.toBeInstanceOf(ForbiddenException)

      expect(prisma.conversation.updateMany).not.toHaveBeenCalled()
      expect(eventEmitter.emit).not.toHaveBeenCalled()
    })

    it('посторонний не может ни отметить, ни снять', async () => {
      await expect(service.setDealConfirmed('c1', 'stranger', true)).rejects.toBeInstanceOf(ForbiddenException)
      await expect(service.setDealConfirmed('c1', 'stranger', false)).rejects.toBeInstanceOf(ForbiddenException)

      expect(prisma.conversation.updateMany).not.toHaveBeenCalled()
    })

    it('чат поддержки через этот метод не отмечается', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ ...conversation, type: ConversationType.SUPPORT })

      await expect(service.setDealConfirmed('c1', 'seller', true)).rejects.toBeInstanceOf(NotFoundException)
      expect(prisma.conversation.updateMany).not.toHaveBeenCalled()
    })

    it('список диалогов сообщает, кто продавец, время отметки и можно ли её поставить', async () => {
      const row = (id: string, buyerId: string, sellerId: string, dealConfirmedAt: Date | null) => ({
        id,
        buyerId,
        sellerId,
        dealConfirmedAt,
        buyerLastReadAt: null,
        sellerLastReadAt: null,
        lastMessageAt: null,
        createdAt: CONFIRMED_AT,
        adTitleSnapshot: 'Трактор',
        ad: null,
        buyer: { id: buyerId },
        seller: { id: sellerId },
        messages: []
      })
      prisma.conversation.findMany.mockResolvedValue([
        row('as-seller', 'other', 'me', CONFIRMED_AT),
        row('as-seller-silent', 'other', 'me', null),
        row('as-buyer', 'me', 'other', null)
      ])
      prisma.message.findMany.mockResolvedValue([{ conversationId: 'as-seller' }])

      const list = await service.getConversations('me')

      // Один запрос ответов на весь список, и только по диалогам, где он продавец.
      expect(prisma.message.findMany).toHaveBeenCalledTimes(1)
      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: { conversationId: { in: ['as-seller', 'as-seller-silent'] }, senderId: 'me' },
        distinct: ['conversationId'],
        select: { conversationId: true }
      })
      expect(
        list.map(({ id, isSeller, canConfirmDeal, dealConfirmedAt }) => ({
          id,
          isSeller,
          canConfirmDeal,
          dealConfirmedAt
        }))
      ).toEqual([
        { id: 'as-seller', isSeller: true, canConfirmDeal: true, dealConfirmedAt: CONFIRMED_AT },
        { id: 'as-seller-silent', isSeller: true, canConfirmDeal: false, dealConfirmedAt: null },
        { id: 'as-buyer', isSeller: false, canConfirmDeal: false, dealConfirmedAt: null }
      ])
    })

    it('если пользователь нигде не продавец, ответы не запрашиваются', async () => {
      prisma.conversation.findMany.mockResolvedValue([])

      await service.getConversations('me')

      expect(prisma.message.findMany).not.toHaveBeenCalled()
    })
  })

  describe('фото в сообщениях', () => {
    const file = { originalname: 'a.jpg', buffer: Buffer.from('x') } as Express.Multer.File
    const PHOTO = 'https://cdn.example.com/chat/1712345678901-1.jpg'

    it('сообщение без текста и без фото отклоняется до обращения к БД и S3', async () => {
      await expect(service.sendMessage('c1', 'buyer', { text: '   ' }, [])).rejects.toBeInstanceOf(BadRequestException)
      await expect(service.sendMessage('c1', 'buyer', {}, [])).rejects.toBeInstanceOf(BadRequestException)

      expect(fileService.uploadChatPhotos).not.toHaveBeenCalled()
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('сообщение только с фото сохраняется с пустым текстом и ссылками, выданными сервером', async () => {
      fileService.uploadChatPhotos.mockResolvedValue([PHOTO])

      await service.sendMessage('c1', 'buyer', {}, [file])

      expect(fileService.uploadChatPhotos).toHaveBeenCalledWith([file])
      expect(prisma.message.create).toHaveBeenCalledWith({
        data: { conversationId: 'c1', senderId: 'buyer', text: '', attachments: [PHOTO] }
      })
    })

    it('заблокированному фото не загружаются', async () => {
      blockedUsersService.isBlocked.mockResolvedValue(true)

      await expect(service.sendMessage('c1', 'buyer', {}, [file])).rejects.toBeInstanceOf(ForbiddenException)
      expect(fileService.uploadChatPhotos).not.toHaveBeenCalled()
    })

    it('если сообщение не сохранилось — загруженные фото удаляются, события нет', async () => {
      fileService.uploadChatPhotos.mockResolvedValue([PHOTO])
      prisma.$transaction.mockRejectedValue(new Error('db down'))

      await expect(service.sendMessage('c1', 'buyer', { text: 'Вот' }, [file])).rejects.toThrow('db down')

      expect(fileService.deleteFilesQuietly).toHaveBeenCalledWith([PHOTO])
      expect(eventEmitter.emit).not.toHaveBeenCalled()
    })

    it('сбой загрузки фото — сообщение не создаётся', async () => {
      fileService.uploadChatPhotos.mockRejectedValue(new Error('s3 down'))

      await expect(service.sendMessage('c1', 'buyer', { text: 'Вот' }, [file])).rejects.toThrow('s3 down')

      expect(prisma.$transaction).not.toHaveBeenCalled()
      expect(eventEmitter.emit).not.toHaveBeenCalled()
    })

    it('начало диалога: сбой загрузки фото не оставляет пустой диалог', async () => {
      fileService.uploadChatPhotos.mockRejectedValue(new Error('s3 down'))

      await expect(service.startConversation('buyer', { adId: 'ad1' }, [file])).rejects.toThrow('s3 down')

      expect(prisma.conversation.upsert).not.toHaveBeenCalled()
    })

    it('начало диалога: фото уходят вместе с первым сообщением', async () => {
      fileService.uploadChatPhotos.mockResolvedValue([PHOTO])

      await service.startConversation('buyer', { adId: 'ad1' }, [file])

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: { conversationId: 'c1', senderId: 'buyer', text: '', attachments: [PHOTO] }
      })
    })

    it('начало диалога: чужого объявления нет — фото не загружаются', async () => {
      prisma.ad.findUnique.mockResolvedValue(null)

      await expect(service.startConversation('buyer', { adId: 'ad1' }, [file])).rejects.toBeInstanceOf(
        NotFoundException
      )
      expect(fileService.uploadChatPhotos).not.toHaveBeenCalled()
    })

    it('физическое удаление диалога убирает фото переписки из S3 после записи в БД', async () => {
      prisma.conversation.findFirst.mockResolvedValue({
        buyerId: 'buyer',
        sellerId: 'seller',
        buyer: { deletedAt: null },
        seller: { deletedAt: new Date() }
      })
      prisma.message.findMany.mockResolvedValue([{ attachments: [PHOTO] }, { attachments: ['b', 'c'] }])

      await service.deleteConversation('c1', 'buyer')

      expect(fileService.deleteFilesQuietly).toHaveBeenCalledWith([PHOTO, 'b', 'c'])
    })

    it('скрытие диалога фото не трогает', async () => {
      prisma.conversation.findFirst.mockResolvedValue({
        buyerId: 'buyer',
        sellerId: 'seller',
        buyer: { deletedAt: null },
        seller: { deletedAt: null }
      })

      await service.deleteConversation('c1', 'buyer')

      expect(fileService.deleteFilesQuietly).not.toHaveBeenCalled()
    })
  })
  describe('защита от спама и мусора', () => {
    it('по неопубликованному объявлению диалог не начинается', async () => {
      for (const status of [AdStatus.ARCHIVED, AdStatus.REJECTED]) {
        prisma.ad.findUnique.mockResolvedValue({
          id: 'ad1',
          userId: 'seller',
          title: 'Трактор',
          status,
          user: { deletedAt: null }
        })

        await expect(service.startConversation('buyer', { adId: 'ad1', text: 'Привет' })).rejects.toBeInstanceOf(
          NotFoundException
        )
      }

      expect(prisma.conversation.upsert).not.toHaveBeenCalled()
      expect(fileService.uploadChatPhotos).not.toHaveBeenCalled()
    })

    it('продавец удалил аккаунт — диалог не начинается', async () => {
      prisma.ad.findUnique.mockResolvedValue({
        id: 'ad1',
        userId: 'seller',
        title: 'Трактор',
        status: AdStatus.PUBLISHED,
        user: { deletedAt: new Date() }
      })

      await expect(service.startConversation('buyer', { adId: 'ad1', text: 'Привет' })).rejects.toBeInstanceOf(
        NotFoundException
      )
    })

    it('диалог и первое сообщение создаются в одной транзакции', async () => {
      await service.startConversation('buyer', { adId: 'ad1', text: 'Привет' })

      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function))
      expect(prisma.conversation.upsert).toHaveBeenCalled()
      expect(prisma.message.create).toHaveBeenCalled()
    })

    it('собеседник удалил аккаунт — писать ему нельзя, сообщение не сохраняется и не рассылается', async () => {
      prisma.user.findUnique.mockResolvedValue({ deletedAt: new Date() })

      await expect(service.sendMessage('c1', 'buyer', { text: 'Привет' })).rejects.toBeInstanceOf(BadRequestException)

      expect(prisma.message.create).not.toHaveBeenCalled()
      expect(eventEmitter.emit).not.toHaveBeenCalled()
    })
  })

  describe('письмо о новом сообщении', () => {
    it('после сохранения сообщения ставится отложенное письмо получателю', async () => {
      const message = await service.sendMessage('c1', 'buyer', { text: 'Привет' })

      expect(chatEmailRemindersService.scheduleForMessage).toHaveBeenCalledWith(message, 'seller')
    })

    it('сообщение рассылается живьём раньше, чем планируется письмо', async () => {
      await service.sendMessage('c1', 'buyer', { text: 'Привет' })

      expect(eventEmitter.emit.mock.invocationCallOrder[0]).toBeLessThan(
        chatEmailRemindersService.scheduleForMessage.mock.invocationCallOrder[0]
      )
    })

    it('заблокированному письмо не планируется', async () => {
      blockedUsersService.isBlocked.mockResolvedValue(true)

      await expect(service.sendMessage('c1', 'buyer', { text: 'Привет' })).rejects.toBeInstanceOf(ForbiddenException)

      expect(chatEmailRemindersService.scheduleForMessage).not.toHaveBeenCalled()
    })
  })
  describe('«Удалить переписку»: история с чистого листа', () => {
    const CLEARED = new Date('2026-10-20T10:00:00.000Z')
    const OLD = new Date('2026-10-19T10:00:00.000Z')
    const NEW = new Date('2026-10-21T10:00:00.000Z')

    it('продавец удаляет — отметка ставится ему, а не покупателю', async () => {
      prisma.conversation.findFirst.mockResolvedValue({
        buyerId: 'buyer',
        sellerId: 'seller',
        buyer: { deletedAt: null },
        seller: { deletedAt: null }
      })

      await service.deleteConversation('c1', 'seller')

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { hiddenBySeller: true, sellerClearedAt: expect.any(Date) }
      })
    })

    it('история удалившего начинается после отметки, у собеседника — целиком', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ ...conversation, buyerClearedAt: CLEARED })

      await service.getMessages('c1', 'buyer', { limit: 30 } as any)
      expect(prisma.message.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { conversationId: 'c1', createdAt: { gt: CLEARED } } })
      )

      await service.getMessages('c1', 'seller', { limit: 30 } as any)
      expect(prisma.message.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({ where: { conversationId: 'c1' } })
      )
    })

    it('при подгрузке старых сообщений граница удаления сохраняется', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ ...conversation, buyerClearedAt: CLEARED })
      const cursor = '2026-10-22T00:00:00.000Z'

      await service.getMessages('c1', 'buyer', { limit: 30, cursor } as any)

      expect(prisma.message.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { conversationId: 'c1', createdAt: { gt: CLEARED, lt: new Date(cursor) } }
        })
      )
    })

    it('в списке старое последнее сообщение не показывается и не считается непрочитанным', async () => {
      const row = (id: string, createdAt: Date) => ({
        id,
        buyerId: 'me',
        sellerId: 'other',
        dealConfirmedAt: null,
        buyerLastReadAt: null,
        sellerLastReadAt: null,
        buyerClearedAt: CLEARED,
        lastMessageAt: createdAt,
        createdAt,
        adTitleSnapshot: 'Трактор',
        ad: null,
        buyer: { id: 'me' },
        seller: { id: 'other' },
        messages: [{ id: `m-${id}`, senderId: 'other', createdAt }]
      })
      prisma.conversation.findMany.mockResolvedValue([row('old', OLD), row('new', NEW)])

      const list = await service.getConversations('me')

      expect(list.map(item => [item.id, item.lastMessage?.id ?? null, item.isUnread])).toEqual([
        ['old', null, false],
        ['new', 'm-new', true]
      ])
    })
  })
})
