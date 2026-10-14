import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'
import type { EventEmitter2 } from '@nestjs/event-emitter'

import { FileService } from '@/file/file.service'
import { ConversationType } from '@/generated/prisma/enums'

import {
  CONVERSATION_MESSAGE_CREATED_EVENT,
  CONVERSATION_READ_EVENT,
  CONVERSATION_REMOVED_EVENT
} from './conversations.events'
import { ConversationsService } from './conversations.service'

describe('ConversationsService: живые события', () => {
  let prisma: any
  let blockedUsersService: any
  let notificationsService: any
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
    const message = { id: 'm1', conversationId: 'c1', senderId: 'buyer', text: 'Привет', attachments: [] }

    prisma = {
      conversation: {
        upsert: jest.fn().mockResolvedValue(conversation),
        findUnique: jest.fn().mockResolvedValue(conversation),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({})
      },
      ad: { findUnique: jest.fn().mockResolvedValue({ id: 'ad1', userId: 'seller', title: 'Трактор' }) },
      message: { create: jest.fn().mockReturnValue(message), findMany: jest.fn().mockResolvedValue([]) },
      user: { findUnique: jest.fn().mockResolvedValue({ displayName: 'Иван' }) },
      $transaction: jest.fn().mockResolvedValue([message])
    }
    blockedUsersService = { isBlocked: jest.fn().mockResolvedValue(false) }
    notificationsService = { notifyNewMessage: jest.fn().mockResolvedValue(undefined) }
    fileService = {
      uploadChatPhotos: jest.fn().mockResolvedValue([]),
      deleteFilesQuietly: jest.fn().mockResolvedValue(undefined)
    }
    eventEmitter = { emit: jest.fn() }

    service = new ConversationsService(
      prisma,
      blockedUsersService,
      notificationsService,
      fileService as unknown as FileService,
      eventEmitter as unknown as EventEmitter2
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

  it('провал уведомления не отменяет рассылку сообщения', async () => {
    notificationsService.notifyNewMessage.mockRejectedValue(new Error('push down'))

    await service.sendMessage('c1', 'buyer', { text: 'Привет' })

    expect(eventEmitter.emit).toHaveBeenCalledWith(CONVERSATION_MESSAGE_CREATED_EVENT, expect.anything())
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

    expect(prisma.conversation.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { hiddenByBuyer: true } })
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

    it('в уведомлении сообщение только с фото подписано «Фото»', async () => {
      const photoMessage = { id: 'm2', conversationId: 'c1', senderId: 'buyer', text: '', attachments: [PHOTO] }

      fileService.uploadChatPhotos.mockResolvedValue([PHOTO])
      prisma.$transaction.mockResolvedValue([photoMessage])

      await service.sendMessage('c1', 'buyer', {}, [file])

      expect(notificationsService.notifyNewMessage).toHaveBeenCalledWith('seller', 'c1', 'Трактор', 'Иван', 'Фото')
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
})
