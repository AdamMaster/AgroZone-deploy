import { NotificationType } from '@/generated/prisma/client'

import { NotificationsService } from './notifications.service'

describe('NotificationsService', () => {
  let prisma: any
  let mailService: { sendAdRejectedEmail: jest.Mock }
  let pushService: { sendToUser: jest.Mock }
  let service: NotificationsService

  beforeEach(() => {
    prisma = {
      notification: {
        create: jest.fn().mockImplementation(async ({ data }) => ({ id: 'n-1', ...data })),
        findFirst: jest.fn().mockResolvedValue(null)
      },
      user: { findUnique: jest.fn().mockResolvedValue({ email: 'seller@example.com' }) }
    }
    mailService = { sendAdRejectedEmail: jest.fn().mockResolvedValue(undefined) }
    pushService = { sendToUser: jest.fn().mockResolvedValue(undefined) }
    service = new NotificationsService(prisma, mailService as any, pushService as any)
  })

  describe('push о событиях', () => {
    it('отклонённое объявление: запись в список и push с причиной в канале «События»', async () => {
      await service.notifyAdRejected('u-1', 'ad-1', 'Трактор МТЗ', 'Нет фото')

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ userId: 'u-1', type: NotificationType.AD_REJECTED, link: '/ads/ad-1/edit' })
      })
      expect(pushService.sendToUser).toHaveBeenCalledWith('u-1', {
        title: 'Объявление отклонено',
        body: 'Объявление «Трактор МТЗ» отклонено модератором. Причина: Нет фото',
        link: 'agrozone://profile/notifications',
        channel: 'events',
        data: { notificationId: 'n-1' }
      })
    })

    it('объявление опубликовано', async () => {
      await service.notifyAdPublished('u-1', 'ad-1', 'Трактор МТЗ')

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ type: NotificationType.AD_PUBLISHED, link: '/ads/ad-1' })
      })
      expect(pushService.sendToUser).toHaveBeenCalledWith(
        'u-1',
        expect.objectContaining({ title: 'Объявление опубликовано', channel: 'events' })
      )
    })

    it.each([
      ['предупреждение продавцу', (s: NotificationsService) => s.notifySellerWarning('u-1')],
      ['объявления приостановлены', (s: NotificationsService) => s.notifySellerAdsSuspended('u-1')],
      ['объявления восстановлены', (s: NotificationsService) => s.notifySellerAdsRestored('u-1')],
      ['новый отзыв о продавце', (s: NotificationsService) => s.notifySellerReviewReceived('u-1')],
      ['ответ продавца на отзыв', (s: NotificationsService) => s.notifySellerReviewReplied('u-1', 's-1')]
    ])('%s — тоже с push', async (_name, notify) => {
      await notify(service)

      expect(pushService.sendToUser).toHaveBeenCalledTimes(1)
      expect(pushService.sendToUser.mock.calls[0][0]).toBe('u-1')
    })

    it.each([
      ['отзыв скрыт', (s: NotificationsService) => s.notifySellerReviewHidden('u-1', 's-1')],
      ['отзыв опубликован', (s: NotificationsService) => s.notifySellerReviewPublished('u-1', 's-1')],
      ['сделка состоялась', (s: NotificationsService) => s.notifyDealConfirmed('u-1', 'c-1')]
    ])('%s — только в списке, без push', async (_name, notify) => {
      await notify(service)

      expect(prisma.notification.create).toHaveBeenCalledTimes(1)
      expect(pushService.sendToUser).not.toHaveBeenCalled()
    })

    it('длинный текст в push обрезается, а в списке остаётся целиком', async () => {
      const reason = 'я'.repeat(500)

      await service.notifyAdRejected('u-1', 'ad-1', 'Трактор', reason)

      const { data } = prisma.notification.create.mock.calls[0][0]
      const { body } = pushService.sendToUser.mock.calls[0][1]

      expect(data.message).toContain(reason)
      expect(body).toHaveLength(241)
      expect(body.endsWith('…')).toBe(true)
    })

    it('push не ждём: ответ не задерживается, пока FCM отвечает', async () => {
      pushService.sendToUser.mockReturnValue(new Promise(() => undefined))

      await expect(service.notifyAdPublished('u-1', 'ad-1', 'Трактор')).resolves.toEqual(
        expect.objectContaining({ id: 'n-1' })
      )
    })

    it('приглашение оценить продавца уже было — второе не создаётся и push не уходит', async () => {
      prisma.notification.findFirst.mockResolvedValue({ id: 'old' })

      await expect(service.notifyDealConfirmed('u-1', 'c-1')).resolves.toBeNull()
      expect(prisma.notification.create).not.toHaveBeenCalled()
      expect(pushService.sendToUser).not.toHaveBeenCalled()
    })
  })

  describe('письмо об отклонении', () => {
    it('отправляется на почту владельца', async () => {
      await service.notifyAdRejected('u-1', 'ad-1', 'Трактор', 'Нет фото')

      expect(mailService.sendAdRejectedEmail).toHaveBeenCalledWith('seller@example.com', 'ad-1', 'Трактор', 'Нет фото')
    })

    it('сбой письма не мешает уведомлению и push', async () => {
      mailService.sendAdRejectedEmail.mockRejectedValue(new Error('SMTP down'))

      await expect(service.notifyAdRejected('u-1', 'ad-1', 'Трактор', null)).resolves.toBeDefined()
      expect(pushService.sendToUser).toHaveBeenCalledTimes(1)
    })
  })
})
