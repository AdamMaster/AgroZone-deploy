import { ForbiddenException } from '@nestjs/common'
import type { EventEmitter2 } from '@nestjs/event-emitter'

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
        findUnique: jest.fn().mockResolvedValue(conversation),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({})
      },
      message: { create: jest.fn().mockReturnValue(message) },
      user: { findUnique: jest.fn().mockResolvedValue({ displayName: 'Иван' }) },
      $transaction: jest.fn().mockResolvedValue([message])
    }
    blockedUsersService = { isBlocked: jest.fn().mockResolvedValue(false) }
    notificationsService = { notifyNewMessage: jest.fn().mockResolvedValue(undefined) }
    eventEmitter = { emit: jest.fn() }

    service = new ConversationsService(
      prisma,
      blockedUsersService,
      notificationsService,
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
})
