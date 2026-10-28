import { NotFoundException } from '@nestjs/common'
import { SellerReviewReportStatus, SellerReviewStatus } from '@/generated/prisma/enums'

import { SellerReviewModerationDecision } from './dto/moderate-seller-review.dto'
import { SellerReviewModerationService } from './seller-review-moderation.service'

const NOW = new Date('2026-10-27T12:00:00.000Z')

describe('SellerReviewModerationService', () => {
  let service: SellerReviewModerationService
  let prisma: any
  let ratingService: any
  let notificationsService: any

  const locked = (status: SellerReviewStatus) => [{ id: 'r1', sellerId: 'seller', authorId: 'author', status }]

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)

    prisma = {
      sellerReview: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(async ({ data }: any) => ({
          id: 'r1',
          sellerId: 'seller',
          authorId: 'author',
          status: data.status,
          moderatedAt: data.moderatedAt
        }))
      },
      sellerReviewReport: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      $queryRaw: jest.fn().mockResolvedValue(locked(SellerReviewStatus.PENDING))
    }
    prisma.$transaction = jest.fn(async (callback: any) => callback(prisma))
    ratingService = { recalculate: jest.fn().mockResolvedValue(undefined) }
    notificationsService = {
      notifySellerReviewHidden: jest.fn().mockResolvedValue({}),
      notifySellerReviewPublished: jest.fn().mockResolvedValue({}),
      notifySellerReviewReceived: jest.fn().mockResolvedValue({})
    }

    service = new SellerReviewModerationService(prisma, ratingService, notificationsService)
  })

  afterEach(() => jest.useRealTimers())

  describe('findQueue', () => {
    it('отдаёт отзывы на проверке и с жалобами, старые первыми, с пагинацией', async () => {
      prisma.sellerReview.count.mockResolvedValue(45)

      const result = await service.findQueue({ page: 3, limit: 20 })

      const args = prisma.sellerReview.findMany.mock.calls[0][0]
      expect(args.where).toEqual({
        OR: [{ status: 'PENDING' }, { reports: { some: { status: 'PENDING' } } }]
      })
      expect(args.orderBy).toEqual([{ createdAt: 'asc' }, { id: 'asc' }])
      expect(args).toEqual(expect.objectContaining({ skip: 40, take: 20 }))
      expect(result).toEqual(expect.objectContaining({ total: 45, page: 3, limit: 20 }))
    })

    it('в очередь идут только нерассмотренные жалобы', async () => {
      await service.findQueue({})

      expect(prisma.sellerReview.findMany.mock.calls[0][0].select.reports.where).toEqual({
        status: SellerReviewReportStatus.PENDING
      })
    })
  })

  describe('moderate', () => {
    it('скрытие: статус HIDDEN, кто и когда, жалобы признаны обоснованными, рейтинг пересчитан, автор уведомлён', async () => {
      const result = await service.moderate('r1', 'admin', { decision: SellerReviewModerationDecision.HIDE })

      expect(prisma.sellerReview.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'r1' },
          data: { status: SellerReviewStatus.HIDDEN, moderatedAt: NOW, moderatedById: 'admin' }
        })
      )
      expect(prisma.sellerReviewReport.updateMany).toHaveBeenCalledWith({
        where: { reviewId: 'r1', status: SellerReviewReportStatus.PENDING },
        data: { status: SellerReviewReportStatus.ACCEPTED }
      })
      expect(ratingService.recalculate).toHaveBeenCalledWith(prisma, ['seller', 'author'])
      expect(notificationsService.notifySellerReviewHidden).toHaveBeenCalledWith('author', 'seller')
      expect(result).toEqual({ id: 'r1', status: SellerReviewStatus.HIDDEN, moderatedAt: NOW })
    })

    it('публикация отзыва с проверки: жалобы отклонены, автору сообщают о публикации', async () => {
      await service.moderate('r1', 'admin', { decision: SellerReviewModerationDecision.PUBLISH })

      expect(prisma.sellerReview.update.mock.calls[0][0].data.status).toBe(SellerReviewStatus.PUBLISHED)
      expect(prisma.sellerReviewReport.updateMany.mock.calls[0][0].data.status).toBe(SellerReviewReportStatus.DISMISSED)
      expect(notificationsService.notifySellerReviewPublished).toHaveBeenCalledWith('author', 'seller')
      // Продавец узнаёт об отзыве, когда тот стал виден.
      expect(notificationsService.notifySellerReviewReceived).toHaveBeenCalledWith('seller')
    })

    it('скрытие отзыва продавцу ничего не сообщает', async () => {
      await service.moderate('r1', 'admin', { decision: SellerReviewModerationDecision.HIDE })

      expect(notificationsService.notifySellerReviewReceived).not.toHaveBeenCalled()
    })

    it('сбой уведомления автору не мешает уведомить продавца', async () => {
      notificationsService.notifySellerReviewPublished.mockRejectedValue(new Error('db down'))

      await service.moderate('r1', 'admin', { decision: SellerReviewModerationDecision.PUBLISH })

      expect(notificationsService.notifySellerReviewReceived).toHaveBeenCalledWith('seller')
    })

    it('возврат скрытого отзыва тоже уведомляет автора', async () => {
      prisma.$queryRaw.mockResolvedValue(locked(SellerReviewStatus.HIDDEN))

      await service.moderate('r1', 'admin', { decision: SellerReviewModerationDecision.PUBLISH })

      expect(notificationsService.notifySellerReviewPublished).toHaveBeenCalled()
    })

    it('отклонение жалоб на уже опубликованный отзыв автору ничего не меняет — без уведомления', async () => {
      prisma.$queryRaw.mockResolvedValue(locked(SellerReviewStatus.PUBLISHED))

      await service.moderate('r1', 'admin', { decision: SellerReviewModerationDecision.PUBLISH })

      expect(notificationsService.notifySellerReviewPublished).not.toHaveBeenCalled()
      expect(notificationsService.notifySellerReviewHidden).not.toHaveBeenCalled()
      expect(notificationsService.notifySellerReviewReceived).not.toHaveBeenCalled()
    })

    it('повторное скрытие уже скрытого отзыва не шлёт уведомление второй раз', async () => {
      prisma.$queryRaw.mockResolvedValue(locked(SellerReviewStatus.HIDDEN))

      await service.moderate('r1', 'admin', { decision: SellerReviewModerationDecision.HIDE })

      expect(notificationsService.notifySellerReviewHidden).not.toHaveBeenCalled()
    })

    it('сбой уведомления не откатывает и не ломает решение', async () => {
      notificationsService.notifySellerReviewHidden.mockRejectedValue(new Error('db down'))

      await expect(service.moderate('r1', 'admin', { decision: SellerReviewModerationDecision.HIDE })).resolves.toEqual(
        expect.objectContaining({ status: SellerReviewStatus.HIDDEN })
      )
    })

    it('отзыва нет — 404, ничего не пишется', async () => {
      prisma.$queryRaw.mockResolvedValue([])

      await expect(
        service.moderate('r1', 'admin', { decision: SellerReviewModerationDecision.HIDE })
      ).rejects.toBeInstanceOf(NotFoundException)

      expect(prisma.sellerReview.update).not.toHaveBeenCalled()
      expect(notificationsService.notifySellerReviewHidden).not.toHaveBeenCalled()
    })
  })
})
