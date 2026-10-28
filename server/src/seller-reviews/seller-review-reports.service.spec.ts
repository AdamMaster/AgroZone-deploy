import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { SellerReviewReportReason, SellerReviewReportStatus, SellerReviewStatus } from '@/generated/prisma/enums'

import { SellerReviewReportsService } from './seller-review-reports.service'

const NOW = new Date('2026-10-27T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

describe('SellerReviewReportsService', () => {
  let service: SellerReviewReportsService
  let prisma: any
  let ratingService: any

  const lockedReview = (overrides: object = {}) => [
    { id: 'r1', sellerId: 'seller', authorId: 'author', status: SellerReviewStatus.PUBLISHED, ...overrides }
  ]

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)

    prisma = {
      sellerReviewReport: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({})
      },
      sellerReview: { update: jest.fn().mockResolvedValue({}) },
      $queryRaw: jest.fn().mockResolvedValue(lockedReview())
    }
    prisma.$transaction = jest.fn(async (callback: any) => callback(prisma))
    ratingService = { recalculate: jest.fn().mockResolvedValue(undefined) }

    service = new SellerReviewReportsService(prisma, ratingService)
  })

  afterEach(() => jest.useRealTimers())

  const dto = { reason: SellerReviewReportReason.FAKE, comment: '  Такого покупателя не было ' }

  it('сохраняет жалобу, комментарий обрезается по краям; ниже порога отзыв остаётся опубликованным', async () => {
    prisma.sellerReviewReport.count.mockResolvedValueOnce(0).mockResolvedValueOnce(2)

    await service.report('r1', 'reporter', dto)

    expect(prisma.sellerReviewReport.create).toHaveBeenCalledWith({
      data: { reviewId: 'r1', reporterId: 'reporter', reason: 'FAKE', comment: 'Такого покупателя не было' }
    })
    expect(prisma.sellerReview.update).not.toHaveBeenCalled()
    expect(ratingService.recalculate).not.toHaveBeenCalled()
  })

  it('пустой комментарий сохраняется как null', async () => {
    await service.report('r1', 'reporter', { reason: SellerReviewReportReason.SPAM, comment: '   ' })

    expect(prisma.sellerReviewReport.create.mock.calls[0][0].data.comment).toBeNull()
  })

  it('третья независимая жалоба отправляет отзыв на проверку и убирает его из рейтинга', async () => {
    prisma.sellerReviewReport.count.mockResolvedValueOnce(0).mockResolvedValueOnce(3)

    await service.report('r1', 'reporter', dto)

    expect(prisma.sellerReview.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { status: SellerReviewStatus.PENDING }
    })
    expect(ratingService.recalculate).toHaveBeenCalledWith(prisma, ['seller', 'author'])
  })

  it('считает только нерассмотренные жалобы от аккаунтов старше семи дней', async () => {
    await service.report('r1', 'reporter', dto)

    expect(prisma.sellerReviewReport.count).toHaveBeenLastCalledWith({
      where: {
        reviewId: 'r1',
        status: SellerReviewReportStatus.PENDING,
        reporter: { createdAt: { lte: new Date(NOW.getTime() - 7 * DAY) } }
      }
    })
  })

  it('на свой отзыв жаловаться нельзя', async () => {
    await expect(service.report('r1', 'author', dto)).rejects.toBeInstanceOf(ForbiddenException)

    expect(prisma.sellerReviewReport.create).not.toHaveBeenCalled()
  })

  it.each([SellerReviewStatus.PENDING, SellerReviewStatus.HIDDEN])(
    'на отзыв в статусе %s пожаловаться нельзя — его никто не видит',
    async status => {
      prisma.$queryRaw.mockResolvedValue(lockedReview({ status }))

      await expect(service.report('r1', 'reporter', dto)).rejects.toBeInstanceOf(NotFoundException)
    }
  )

  it('отзыва нет — 404', async () => {
    prisma.$queryRaw.mockResolvedValue([])

    await expect(service.report('r1', 'reporter', dto)).rejects.toBeInstanceOf(NotFoundException)
  })

  it('лимит жалоб в сутки: десятая за сутки уже последняя, одиннадцатая отклоняется до транзакции', async () => {
    prisma.sellerReviewReport.count.mockResolvedValue(10)

    await expect(service.report('r1', 'reporter', dto)).rejects.toBeInstanceOf(ForbiddenException)

    expect(prisma.sellerReviewReport.count).toHaveBeenCalledWith({
      where: { reporterId: 'reporter', createdAt: { gte: new Date(NOW.getTime() - DAY) } }
    })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('повторная жалоба того же человека — 409', async () => {
    prisma.sellerReviewReport.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' })
    )

    await expect(service.report('r1', 'reporter', dto)).rejects.toBeInstanceOf(ConflictException)
  })

  it('прочие ошибки базы не маскируются', async () => {
    prisma.sellerReviewReport.create.mockRejectedValue(new Error('db down'))

    await expect(service.report('r1', 'reporter', dto)).rejects.toThrow('db down')
  })
})
