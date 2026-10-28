import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { SellerReportReason, SellerReportStatus, SellerSanctionType } from '@/generated/prisma/enums'

import { SellerReportsService } from './seller-reports.service'

const NOW = new Date('2026-10-27T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

describe('SellerReportsService', () => {
  let service: SellerReportsService
  let prisma: any
  let adsSuspension: any
  let notificationsService: any

  const dto = { reason: SellerReportReason.PREPAYMENT_SCAM, comment: '  Взял предоплату и пропал ' }

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)

    prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ deletedAt: null }) },
      conversation: { count: jest.fn().mockResolvedValue(1) },
      adPhoneReveal: { count: jest.fn().mockResolvedValue(0) },
      ad: { count: jest.fn().mockResolvedValue(1) },
      sellerReport: { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({}) },
      sellerSanction: { create: jest.fn().mockResolvedValue({}) },
      $queryRaw: jest.fn().mockResolvedValue([])
    }
    prisma.$transaction = jest.fn(async (callback: any) => callback(prisma))
    adsSuspension = { suspend: jest.fn().mockResolvedValue(0) }
    notificationsService = { notifySellerAdsSuspended: jest.fn().mockResolvedValue({}) }

    service = new SellerReportsService(prisma, adsSuspension, notificationsService)
  })

  afterEach(() => jest.useRealTimers())

  // Первый вызов count — лимит жалоб в сутки, второй — независимые жалобы.
  const withIndependentReports = (count: number) =>
    prisma.sellerReport.count.mockResolvedValueOnce(0).mockResolvedValueOnce(count)

  it('сохраняет жалобу: комментарий обрезается, объявление необязательно; ниже порога ничего не приостанавливается', async () => {
    withIndependentReports(2)

    await service.report('seller', 'reporter', dto)

    expect(prisma.sellerReport.create).toHaveBeenCalledWith({
      data: {
        sellerId: 'seller',
        reporterId: 'reporter',
        adId: null,
        reason: 'PREPAYMENT_SCAM',
        comment: 'Взял предоплату и пропал'
      }
    })
    expect(adsSuspension.suspend).not.toHaveBeenCalled()
    expect(notificationsService.notifySellerAdsSuspended).not.toHaveBeenCalled()
  })

  it('блокирует строку продавца до записи жалобы', async () => {
    withIndependentReports(0)

    await service.report('seller', 'reporter', dto)

    expect(prisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.sellerReport.create.mock.invocationCallOrder[0]
    )
  })

  it('третья независимая жалоба приостанавливает объявления, пишет меру в журнал и уведомляет продавца', async () => {
    withIndependentReports(3)
    adsSuspension.suspend.mockResolvedValue(5)

    await service.report('seller', 'reporter', dto)

    expect(adsSuspension.suspend).toHaveBeenCalledWith(prisma, 'seller')
    expect(prisma.sellerSanction.create).toHaveBeenCalledWith({
      data: { sellerId: 'seller', type: SellerSanctionType.ADS_SUSPENDED }
    })
    expect(notificationsService.notifySellerAdsSuspended).toHaveBeenCalledWith('seller')
  })

  it('порог достигнут, но опубликованных объявлений нет — меры и уведомления нет', async () => {
    withIndependentReports(4)
    adsSuspension.suspend.mockResolvedValue(0)

    await service.report('seller', 'reporter', dto)

    expect(prisma.sellerSanction.create).not.toHaveBeenCalled()
    expect(notificationsService.notifySellerAdsSuspended).not.toHaveBeenCalled()
  })

  it('считает только нерассмотренные жалобы от аккаунтов старше семи дней', async () => {
    withIndependentReports(0)

    await service.report('seller', 'reporter', dto)

    expect(prisma.sellerReport.count).toHaveBeenLastCalledWith({
      where: {
        sellerId: 'seller',
        status: SellerReportStatus.PENDING,
        reporter: { createdAt: { lte: new Date(NOW.getTime() - 7 * DAY) } }
      }
    })
  })

  it('сбой уведомления не ломает жалобу', async () => {
    withIndependentReports(3)
    adsSuspension.suspend.mockResolvedValue(1)
    notificationsService.notifySellerAdsSuspended.mockRejectedValue(new Error('db down'))

    await expect(service.report('seller', 'reporter', dto)).resolves.toBeUndefined()
  })

  it('на себя жаловаться нельзя', async () => {
    await expect(service.report('same', 'same', dto)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it.each([null, { deletedAt: new Date() }])('продавца нет или он удалён (%o) — 404', async seller => {
    prisma.user.findUnique.mockResolvedValue(seller)

    await expect(service.report('seller', 'reporter', dto)).rejects.toBeInstanceOf(NotFoundException)
  })

  describe('допуск к жалобе', () => {
    it('диалог с продавцом даёт право пожаловаться', async () => {
      prisma.conversation.count.mockResolvedValue(1)
      withIndependentReports(0)

      await expect(service.report('seller', 'reporter', dto)).resolves.toBeUndefined()
      expect(prisma.conversation.count).toHaveBeenCalledWith({
        where: { type: 'AD', buyerId: 'reporter', sellerId: 'seller' }
      })
    })

    it('показанный телефон тоже даёт право', async () => {
      prisma.conversation.count.mockResolvedValue(0)
      prisma.adPhoneReveal.count.mockResolvedValue(1)
      withIndependentReports(0)

      await expect(service.report('seller', 'reporter', dto)).resolves.toBeUndefined()
      expect(prisma.adPhoneReveal.count).toHaveBeenCalledWith({ where: { userId: 'reporter', sellerId: 'seller' } })
    })

    it('без контакта с продавцом жаловаться нельзя', async () => {
      prisma.conversation.count.mockResolvedValue(0)
      prisma.adPhoneReveal.count.mockResolvedValue(0)

      await expect(service.report('seller', 'reporter', dto)).rejects.toBeInstanceOf(ForbiddenException)
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('объявление в жалобе', () => {
    it('сохраняется, если принадлежит продавцу', async () => {
      withIndependentReports(0)

      await service.report('seller', 'reporter', { ...dto, adId: 'ad1' })

      expect(prisma.ad.count).toHaveBeenCalledWith({ where: { id: 'ad1', userId: 'seller' } })
      expect(prisma.sellerReport.create.mock.calls[0][0].data.adId).toBe('ad1')
    })

    it('чужое объявление — 400, жалоба не пишется', async () => {
      prisma.ad.count.mockResolvedValue(0)

      await expect(service.report('seller', 'reporter', { ...dto, adId: 'ad1' })).rejects.toBeInstanceOf(
        BadRequestException
      )
      expect(prisma.sellerReport.create).not.toHaveBeenCalled()
    })
  })

  it('лимит жалоб в сутки: шестая отклоняется до записи', async () => {
    prisma.sellerReport.count.mockResolvedValue(5)

    await expect(service.report('seller', 'reporter', dto)).rejects.toBeInstanceOf(ForbiddenException)

    expect(prisma.sellerReport.count).toHaveBeenCalledWith({
      where: { reporterId: 'reporter', createdAt: { gte: new Date(NOW.getTime() - DAY) } }
    })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('повторная жалоба того же человека — 409', async () => {
    prisma.sellerReport.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' })
    )

    await expect(service.report('seller', 'reporter', dto)).rejects.toBeInstanceOf(ConflictException)
  })

  it('прочие ошибки базы не маскируются', async () => {
    prisma.sellerReport.create.mockRejectedValue(new Error('db down'))

    await expect(service.report('seller', 'reporter', dto)).rejects.toThrow('db down')
  })
})
