import { ConflictException, NotFoundException } from '@nestjs/common'
import {
  AdStatus,
  SellerReportStatus,
  SellerReviewReportStatus,
  SellerReviewStatus,
  SellerSanctionType
} from '@/generated/prisma/enums'

import { SellerReportResolutionAction } from './dto/resolve-seller-reports.dto'
import { SellerReportsModerationService } from './seller-reports-moderation.service'

const NOW = new Date('2026-10-27T12:00:00.000Z')

describe('SellerReportsModerationService', () => {
  let service: SellerReportsModerationService
  let prisma: any
  let adsSuspension: any
  let ratingService: any
  let signalsService: any
  let notificationsService: any

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)

    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'seller' }), findMany: jest.fn().mockResolvedValue([]) },
      ad: { groupBy: jest.fn().mockResolvedValue([]) },
      sellerReport: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(2),
        updateMany: jest.fn().mockResolvedValue({ count: 2 })
      },
      sellerSanction: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({}) },
      sellerReview: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 })
      },
      sellerReviewReport: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      $queryRaw: jest.fn().mockResolvedValue([])
    }
    prisma.$transaction = jest.fn(async (callback: any) => callback(prisma))
    adsSuspension = { suspend: jest.fn().mockResolvedValue(0), restore: jest.fn().mockResolvedValue(0) }
    ratingService = { recalculate: jest.fn().mockResolvedValue(undefined) }
    signalsService = { getSignals: jest.fn().mockResolvedValue({ totalReviews: 0, flagged: [] }) }
    notificationsService = {
      notifySellerWarning: jest.fn().mockResolvedValue({}),
      notifySellerAdsSuspended: jest.fn().mockResolvedValue({}),
      notifySellerAdsRestored: jest.fn().mockResolvedValue({})
    }

    service = new SellerReportsModerationService(
      prisma,
      adsSuspension,
      ratingService,
      signalsService,
      notificationsService
    )
  })

  afterEach(() => jest.useRealTimers())

  describe('findQueue', () => {
    it('продавцы с нерассмотренными жалобами, у кого жалоба висит дольше — первыми; с числом приостановленных объявлений', async () => {
      const oldest = new Date('2026-10-20')
      prisma.sellerReport.groupBy
        .mockResolvedValueOnce([{ sellerId: 's1', _count: { _all: 3 }, _min: { createdAt: oldest } }])
        .mockResolvedValueOnce([{ sellerId: 's1' }, { sellerId: 's2' }])
      prisma.user.findMany.mockResolvedValue([{ id: 's1', displayName: 'Иван' }])
      prisma.ad.groupBy.mockResolvedValue([{ userId: 's1', _count: { _all: 4 } }])

      const result = await service.findQueue({ page: 1, limit: 20 })

      expect(prisma.sellerReport.groupBy.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          by: ['sellerId'],
          where: { status: SellerReportStatus.PENDING },
          orderBy: [{ _min: { createdAt: 'asc' } }, { sellerId: 'asc' }],
          skip: 0,
          take: 20
        })
      )
      expect(prisma.ad.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: { in: ['s1'] }, status: AdStatus.SUSPENDED } })
      )
      expect(result).toEqual({
        items: [
          { seller: { id: 's1', displayName: 'Иван' }, pendingReports: 3, oldestReportAt: oldest, suspendedAds: 4 }
        ],
        total: 2,
        page: 1,
        limit: 20
      })
    })

    it('вторая страница пропускает первую', async () => {
      await service.findQueue({ page: 3, limit: 10 })

      expect(prisma.sellerReport.groupBy.mock.calls[0][0]).toEqual(expect.objectContaining({ skip: 20, take: 10 }))
    })
  })

  describe('getSellerCard', () => {
    it('собирает продавца, объявления по статусам, жалобы, меры и сигналы накрутки', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'seller', displayName: 'Иван' })
      prisma.ad.groupBy.mockResolvedValue([
        { status: AdStatus.PUBLISHED, _count: { _all: 3 } },
        { status: AdStatus.SUSPENDED, _count: { _all: 1 } }
      ])
      prisma.sellerReport.findMany.mockResolvedValue([{ id: 'rep1' }])
      prisma.sellerSanction.findMany.mockResolvedValue([{ id: 'san1' }])
      signalsService.getSignals.mockResolvedValue({ totalReviews: 5, flagged: ['REVIEW_BURST'] })

      expect(await service.getSellerCard('seller')).toEqual({
        seller: { id: 'seller', displayName: 'Иван' },
        ads: { PUBLISHED: 3, SUSPENDED: 1 },
        reports: [{ id: 'rep1' }],
        sanctions: [{ id: 'san1' }],
        reviewSignals: { totalReviews: 5, flagged: ['REVIEW_BURST'] }
      })
      expect(signalsService.getSignals).toHaveBeenCalledWith('seller')
    })

    it('продавца нет — 404', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(service.getSellerCard('seller')).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('resolve', () => {
    it('нет нерассмотренных жалоб — 409, ничего не меняется', async () => {
      prisma.sellerReport.count.mockResolvedValue(0)

      await expect(
        service.resolve('seller', 'admin', { action: SellerReportResolutionAction.WARN })
      ).rejects.toBeInstanceOf(ConflictException)

      expect(prisma.sellerReport.updateMany).not.toHaveBeenCalled()
      expect(adsSuspension.suspend).not.toHaveBeenCalled()
    })

    it('блокирует продавца до подсчёта жалоб', async () => {
      await service.resolve('seller', 'admin', { action: SellerReportResolutionAction.DISMISS })

      expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.sellerReport.count.mock.invocationCallOrder[0]
      )
    })

    describe('DISMISS', () => {
      it('жалобы отклонены, приостановленные объявления возвращены, продавец уведомлён', async () => {
        adsSuspension.restore.mockResolvedValue(3)

        const result = await service.resolve('seller', 'admin', { action: SellerReportResolutionAction.DISMISS })

        expect(prisma.sellerReport.updateMany).toHaveBeenCalledWith({
          where: { sellerId: 'seller', status: SellerReportStatus.PENDING },
          data: { status: SellerReportStatus.DISMISSED, resolvedAt: NOW }
        })
        expect(prisma.sellerSanction.create).toHaveBeenCalledWith({
          data: { sellerId: 'seller', moderatorId: 'admin', type: SellerSanctionType.ADS_RESTORED, note: null }
        })
        expect(notificationsService.notifySellerAdsRestored).toHaveBeenCalledWith('seller')
        expect(notificationsService.notifySellerWarning).not.toHaveBeenCalled()
        expect(result).toEqual({ sellerId: 'seller', action: 'DISMISS' })
      })

      it('объявления не были приостановлены — без меры в журнале и без уведомления', async () => {
        await service.resolve('seller', 'admin', { action: SellerReportResolutionAction.DISMISS })

        expect(prisma.sellerSanction.create).not.toHaveBeenCalled()
        expect(notificationsService.notifySellerAdsRestored).not.toHaveBeenCalled()
      })
    })

    describe('WARN', () => {
      it('жалобы приняты, предупреждение записано с заметкой, объявления возвращены, продавец уведомлён', async () => {
        adsSuspension.restore.mockResolvedValue(2)

        await service.resolve('seller', 'admin', { action: SellerReportResolutionAction.WARN, note: '  Первый раз ' })

        expect(prisma.sellerReport.updateMany.mock.calls[0][0].data.status).toBe(SellerReportStatus.ACCEPTED)
        expect(prisma.sellerSanction.create).toHaveBeenCalledWith({
          data: { sellerId: 'seller', moderatorId: 'admin', type: SellerSanctionType.WARNING, note: 'Первый раз' }
        })
        expect(notificationsService.notifySellerWarning).toHaveBeenCalledWith('seller')
        expect(notificationsService.notifySellerAdsRestored).toHaveBeenCalledWith('seller')
        expect(adsSuspension.suspend).not.toHaveBeenCalled()
      })
    })

    describe('SUSPEND_ADS', () => {
      it('жалобы приняты, объявления приостановлены, мера записана, продавец уведомлён', async () => {
        adsSuspension.suspend.mockResolvedValue(6)

        await service.resolve('seller', 'admin', { action: SellerReportResolutionAction.SUSPEND_ADS, note: 'Обман' })

        expect(prisma.sellerReport.updateMany.mock.calls[0][0].data.status).toBe(SellerReportStatus.ACCEPTED)
        expect(prisma.sellerSanction.create).toHaveBeenCalledWith({
          data: { sellerId: 'seller', moderatorId: 'admin', type: SellerSanctionType.ADS_SUSPENDED, note: 'Обман' }
        })
        expect(notificationsService.notifySellerAdsSuspended).toHaveBeenCalledWith('seller')
        expect(adsSuspension.restore).not.toHaveBeenCalled()
      })

      it('объявления уже приостановлены автоматически — повторной меры и уведомления нет', async () => {
        adsSuspension.suspend.mockResolvedValue(0)

        await service.resolve('seller', 'admin', { action: SellerReportResolutionAction.SUSPEND_ADS })

        expect(prisma.sellerSanction.create).not.toHaveBeenCalled()
        expect(notificationsService.notifySellerAdsSuspended).not.toHaveBeenCalled()
      })
    })

    it('сбой уведомления не откатывает решение', async () => {
      adsSuspension.suspend.mockResolvedValue(1)
      notificationsService.notifySellerAdsSuspended.mockRejectedValue(new Error('db down'))

      await expect(
        service.resolve('seller', 'admin', { action: SellerReportResolutionAction.SUSPEND_ADS })
      ).resolves.toEqual({ sellerId: 'seller', action: 'SUSPEND_ADS' })
    })
  })

  describe('rollbackReviews', () => {
    it('скрывает все нескрытые отзывы продавца, закрывает жалобы на них, пересчитывает рейтинг продавца и авторов, пишет меру', async () => {
      prisma.sellerReview.findMany.mockResolvedValue([
        { id: 'r1', authorId: 'a1' },
        { id: 'r2', authorId: 'a2' }
      ])

      const result = await service.rollbackReviews('seller', 'admin', { note: ' Накрутка ' })

      expect(prisma.sellerReview.findMany).toHaveBeenCalledWith({
        where: { sellerId: 'seller', status: { not: SellerReviewStatus.HIDDEN } },
        select: { id: true, authorId: true }
      })
      expect(prisma.sellerReview.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['r1', 'r2'] } },
        data: { status: SellerReviewStatus.HIDDEN, moderatedAt: NOW, moderatedById: 'admin' }
      })
      expect(prisma.sellerReviewReport.updateMany).toHaveBeenCalledWith({
        where: { reviewId: { in: ['r1', 'r2'] }, status: SellerReviewReportStatus.PENDING },
        data: { status: SellerReviewReportStatus.ACCEPTED }
      })
      expect(ratingService.recalculate).toHaveBeenCalledWith(prisma, ['seller', 'a1', 'a2'])
      expect(prisma.sellerSanction.create).toHaveBeenCalledWith({
        data: { sellerId: 'seller', moderatorId: 'admin', type: SellerSanctionType.REVIEWS_HIDDEN, note: 'Накрутка' }
      })
      expect(result).toEqual({ sellerId: 'seller', hidden: 2 })
    })

    it('отзывов нет — ничего не пишется, меры в журнале нет', async () => {
      const result = await service.rollbackReviews('seller', 'admin', {})

      expect(prisma.sellerReview.updateMany).not.toHaveBeenCalled()
      expect(ratingService.recalculate).not.toHaveBeenCalled()
      expect(prisma.sellerSanction.create).not.toHaveBeenCalled()
      expect(result).toEqual({ sellerId: 'seller', hidden: 0 })
    })

    it('продавца нет — 404', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(service.rollbackReviews('seller', 'admin', {})).rejects.toBeInstanceOf(NotFoundException)
    })
  })
})
