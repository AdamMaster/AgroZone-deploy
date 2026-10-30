import type { Message } from '@/generated/prisma/client'
import type { NotificationsService } from '@/notifications/notifications.service'

import { ChatEmailRemindersService } from './chat-email-reminders.service'
import {
  CHAT_EMAIL_BATCH_SIZE,
  CHAT_EMAIL_COOLDOWN_MS,
  CHAT_EMAIL_DELAY_MS,
  CHAT_EMAIL_MAX_BATCHES
} from './constants/conversations.constants'

const createdAt = new Date('2026-10-29T12:00:00.000Z')

const message = {
  id: 'm1',
  conversationId: 'c1',
  senderId: 'buyer',
  text: 'Привет',
  attachments: [],
  createdAt
} as unknown as Message

const recipient = { email: 'seller@example.com', deletedAt: null, chatEmailNotifications: true }

const conversationForSchedule = { buyerId: 'buyer', buyerLastReadAt: null, sellerLastReadAt: null }

const conversationForSend = {
  buyerId: 'buyer',
  sellerId: 'seller',
  buyerLastReadAt: null,
  sellerLastReadAt: null,
  adTitleSnapshot: 'Трактор',
  ad: { title: 'Трактор (новый)' }
}

describe('ChatEmailRemindersService', () => {
  let prisma: any
  let notificationsService: { notifyNewMessageByEmail: jest.Mock }
  let service: ChatEmailRemindersService

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(recipient) },
      conversation: { findUnique: jest.fn().mockResolvedValue(conversationForSchedule) },
      message: { count: jest.fn().mockResolvedValue(0), findFirst: jest.fn() },
      chatEmailReminder: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $queryRaw: jest.fn().mockResolvedValue([])
    }
    notificationsService = { notifyNewMessageByEmail: jest.fn().mockResolvedValue(undefined) }

    service = new ChatEmailRemindersService(prisma, notificationsService as unknown as NotificationsService)
  })

  describe('постановка напоминания', () => {
    it('первое непрочитанное сообщение — письмо назначается через задержку', async () => {
      await service.scheduleForMessage(message, 'seller')

      expect(prisma.chatEmailReminder.createMany).toHaveBeenCalledWith({
        data: [
          { conversationId: 'c1', recipientId: 'seller', dueAt: new Date(createdAt.getTime() + CHAT_EMAIL_DELAY_MS) }
        ],
        skipDuplicates: true
      })
    })

    it('пока получатель не прочёл предыдущее сообщение, новое напоминания не создаёт', async () => {
      prisma.message.count.mockResolvedValue(1)

      await service.scheduleForMessage(message, 'seller')

      expect(prisma.chatEmailReminder.createMany).not.toHaveBeenCalled()
    })

    it('предыдущие сообщения ищутся за период напоминания, если получатель давно не читал', async () => {
      await service.scheduleForMessage(message, 'seller')

      expect(prisma.message.count).toHaveBeenCalledWith({
        where: {
          conversationId: 'c1',
          senderId: 'buyer',
          createdAt: { gte: new Date(createdAt.getTime() - CHAT_EMAIL_COOLDOWN_MS), lt: createdAt }
        }
      })
    })

    it('если получатель недавно открывал диалог, учитываются только сообщения после этого', async () => {
      const readAt = new Date('2026-10-29T11:30:00.000Z')
      prisma.conversation.findUnique.mockResolvedValue({ ...conversationForSchedule, sellerLastReadAt: readAt })

      await service.scheduleForMessage(message, 'seller')

      expect(prisma.message.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ createdAt: { gte: readAt, lt: createdAt } })
      })
    })

    it.each([
      ['письма отключены в настройках', { ...recipient, chatEmailNotifications: false }],
      ['у получателя нет почты', { ...recipient, email: null }],
      ['получатель удалил аккаунт', { ...recipient, deletedAt: new Date() }],
      ['получателя нет', null]
    ])('%s — напоминание не создаётся', async (_name, user) => {
      prisma.user.findUnique.mockResolvedValue(user)

      await service.scheduleForMessage(message, 'seller')

      expect(prisma.chatEmailReminder.createMany).not.toHaveBeenCalled()
      expect(prisma.message.count).not.toHaveBeenCalled()
    })

    it('сбой базы не пробрасывается: сообщение от этого не должно ломаться', async () => {
      prisma.chatEmailReminder.createMany.mockRejectedValue(new Error('db down'))

      await expect(service.scheduleForMessage(message, 'seller')).resolves.toBeUndefined()
    })
  })

  describe('отправка созревших писем', () => {
    const due = { conversationId: 'c1', recipientId: 'seller' }
    const unreadMessage = { text: ' Ещё продаёте? ', attachments: [], sender: { displayName: 'Иван' } }

    beforeEach(() => {
      prisma.$queryRaw.mockResolvedValue([due])
      prisma.conversation.findUnique.mockResolvedValue(conversationForSend)
      prisma.message.findFirst.mockResolvedValue(unreadMessage)
    })

    it('сообщение осталось непрочитанным — письмо уходит с заголовком объявления и текстом', async () => {
      const sent = await service.processDue()

      expect(sent).toBe(1)
      expect(notificationsService.notifyNewMessageByEmail).toHaveBeenCalledWith(
        'seller',
        'c1',
        'Трактор',
        'Иван',
        'Ещё продаёте?'
      )
    })

    it('ищется последнее непрочитанное сообщение собеседника после времени прочтения', async () => {
      const readAt = new Date('2026-10-29T11:00:00.000Z')
      prisma.conversation.findUnique.mockResolvedValue({ ...conversationForSend, sellerLastReadAt: readAt })

      await service.processDue()

      expect(prisma.message.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId: 'c1', senderId: 'buyer', deletedAt: null, createdAt: { gt: readAt } },
          orderBy: { createdAt: 'desc' }
        })
      )
    })

    it('покупателю ищется сообщение продавца', async () => {
      prisma.$queryRaw.mockResolvedValue([{ conversationId: 'c1', recipientId: 'buyer' }])

      await service.processDue()

      expect(prisma.message.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ senderId: 'seller' }) })
      )
    })

    it('получатель успел прочитать — письма нет', async () => {
      prisma.message.findFirst.mockResolvedValue(null)

      expect(await service.processDue()).toBe(0)
      expect(notificationsService.notifyNewMessageByEmail).not.toHaveBeenCalled()
    })

    it('сообщение только с фото подписано в письме «Фото»', async () => {
      prisma.message.findFirst.mockResolvedValue({ ...unreadMessage, text: '', attachments: ['https://x/1.jpg'] })

      await service.processDue()

      expect(notificationsService.notifyNewMessageByEmail).toHaveBeenCalledWith(
        'seller',
        'c1',
        'Трактор',
        'Иван',
        'Фото'
      )
    })

    it('заголовок берётся из объявления, если снимка нет', async () => {
      prisma.conversation.findUnique.mockResolvedValue({ ...conversationForSend, adTitleSnapshot: null })

      await service.processDue()

      expect(notificationsService.notifyNewMessageByEmail).toHaveBeenCalledWith(
        'seller',
        'c1',
        'Трактор (новый)',
        'Иван',
        'Ещё продаёте?'
      )
    })

    it.each([
      ['письма отключены за время ожидания', { ...recipient, chatEmailNotifications: false }],
      ['получатель удалил аккаунт за время ожидания', { ...recipient, deletedAt: new Date() }],
      ['почту отвязали за время ожидания', { ...recipient, email: null }]
    ])('%s — письма нет', async (_name, user) => {
      prisma.user.findUnique.mockResolvedValue(user)

      expect(await service.processDue()).toBe(0)
      expect(notificationsService.notifyNewMessageByEmail).not.toHaveBeenCalled()
    })

    it('сбой одного письма не останавливает остальные в пачке', async () => {
      prisma.$queryRaw.mockResolvedValue([due, { conversationId: 'c2', recipientId: 'seller' }])
      notificationsService.notifyNewMessageByEmail.mockRejectedValueOnce(new Error('smtp down'))

      expect(await service.processDue()).toBe(1)
      expect(notificationsService.notifyNewMessageByEmail).toHaveBeenCalledTimes(2)
    })

    it('созревшие забираются запросом с блокировкой SKIP LOCKED и лимитом пачки', async () => {
      await service.processDue(new Date('2026-10-29T12:30:00.000Z'))

      const query = prisma.$queryRaw.mock.calls[0][0] as { sql: string; values: unknown[] }

      expect(query.sql).toContain('DELETE FROM chat_email_reminders')
      expect(query.sql).toContain('FOR UPDATE SKIP LOCKED')
      expect(query.values).toEqual([new Date('2026-10-29T12:30:00.000Z'), CHAT_EMAIL_BATCH_SIZE])
    })

    it('полная пачка — забирается следующая, неполная — остановка', async () => {
      const full = Array.from({ length: CHAT_EMAIL_BATCH_SIZE }, (_, i) => ({
        conversationId: `c${i}`,
        recipientId: 'seller'
      }))
      prisma.$queryRaw.mockResolvedValueOnce(full).mockResolvedValueOnce([due])

      expect(await service.processDue()).toBe(CHAT_EMAIL_BATCH_SIZE + 1)
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2)
    })

    it('за один запуск пачек не больше предела: остальное подхватит следующий запуск', async () => {
      const full = Array.from({ length: CHAT_EMAIL_BATCH_SIZE }, (_, i) => ({
        conversationId: `c${i}`,
        recipientId: 'seller'
      }))
      prisma.$queryRaw.mockResolvedValue(full)

      await service.processDue()

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(CHAT_EMAIL_MAX_BATCHES)
    })

    it('нечего отправлять — один запрос и ноль писем', async () => {
      prisma.$queryRaw.mockResolvedValue([])

      expect(await service.processDue()).toBe(0)
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
    })
  })
})
