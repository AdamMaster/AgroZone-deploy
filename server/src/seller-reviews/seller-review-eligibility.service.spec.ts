import { SellerReviewContactType } from '@/generated/prisma/enums'

import { SellerReviewEligibilityService } from './seller-review-eligibility.service'
import { SellerReviewBlockReason } from './seller-review-eligibility.types'

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000
const NOW = new Date('2026-10-27T12:00:00.000Z')
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * HOUR)

describe('SellerReviewEligibilityService', () => {
  let service: SellerReviewEligibilityService
  let prisma: any
  let blockedUsersService: any

  beforeEach(() => {
    prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'author', createdAt: new Date(NOW.getTime() - 60 * DAY), deletedAt: null },
          { id: 'seller', createdAt: new Date(NOW.getTime() - 90 * DAY), deletedAt: null }
        ])
      },
      sellerReview: { findUnique: jest.fn().mockResolvedValue(null), count: jest.fn().mockResolvedValue(0) },
      conversation: { findMany: jest.fn().mockResolvedValue([]) },
      message: { groupBy: jest.fn().mockResolvedValue([]) },
      adPhoneReveal: { findFirst: jest.fn().mockResolvedValue(null) }
    }
    blockedUsersService = { isBlocked: jest.fn().mockResolvedValue(false) }

    service = new SellerReviewEligibilityService(prisma, blockedUsersService)
  })

  const check = () => service.check('author', 'seller', NOW)

  const chatRows = (authorCount: number, sellerCount: number, sellerFirstHoursAgo: number) => [
    {
      conversationId: 'c1',
      senderId: 'author',
      _count: { _all: authorCount },
      _min: { createdAt: hoursAgo(sellerFirstHoursAgo + 1) }
    },
    {
      conversationId: 'c1',
      senderId: 'seller',
      _count: { _all: sellerCount },
      _min: { createdAt: hoursAgo(sellerFirstHoursAgo) }
    }
  ]

  it('себе отзыв оставить нельзя, и базу при этом не трогаем', async () => {
    const result = await service.check('seller', 'seller', NOW)

    expect(result).toMatchObject({ canReview: false, reason: SellerReviewBlockReason.Self })
    expect(prisma.user.findMany).not.toHaveBeenCalled()
  })

  it.each([
    ['продавца нет', [{ id: 'author', createdAt: hoursAgo(10_000), deletedAt: null }]],
    [
      'продавец удалил аккаунт',
      [
        { id: 'author', createdAt: hoursAgo(10_000), deletedAt: null },
        { id: 'seller', createdAt: hoursAgo(10_000), deletedAt: hoursAgo(5) }
      ]
    ]
  ])('%s — продавец недоступен', async (_name, users) => {
    prisma.user.findMany.mockResolvedValue(users)

    expect(await check()).toMatchObject({ canReview: false, reason: SellerReviewBlockReason.SellerUnavailable })
  })

  it('аккаунту автора меньше недели — отказ с датой, когда можно', async () => {
    const createdAt = hoursAgo(24)
    prisma.user.findMany.mockResolvedValue([
      { id: 'author', createdAt, deletedAt: null },
      { id: 'seller', createdAt: hoursAgo(10_000), deletedAt: null }
    ])

    expect(await check()).toEqual({
      canReview: false,
      reason: SellerReviewBlockReason.AccountTooYoung,
      message: expect.any(String),
      availableAt: new Date(createdAt.getTime() + 7 * DAY)
    })
  })

  it('отзыв уже есть — отказ раньше любых проверок контакта', async () => {
    prisma.sellerReview.findUnique.mockResolvedValue({ id: 'r1' })

    expect(await check()).toMatchObject({ canReview: false, reason: SellerReviewBlockReason.AlreadyReviewed })
    expect(prisma.conversation.findMany).not.toHaveBeenCalled()
  })

  it('блокировка в любую сторону — отказ с нейтральным текстом', async () => {
    blockedUsersService.isBlocked.mockResolvedValue(true)

    const result = await check()

    expect(result).toMatchObject({ canReview: false, reason: SellerReviewBlockReason.Blocked })
    expect(blockedUsersService.isBlocked).toHaveBeenCalledWith('author', 'seller')
    expect(JSON.stringify(result)).not.toMatch(/заблокир/i)
  })

  it('без контакта оставить отзыв нельзя', async () => {
    expect(await check()).toMatchObject({ canReview: false, reason: SellerReviewBlockReason.NoContact })
  })

  it('сделка подтверждена продавцом — полноценный отзыв, переписку считать не нужно', async () => {
    prisma.conversation.findMany.mockResolvedValue([
      { id: 'old', dealConfirmedAt: hoursAgo(300) },
      { id: 'latest', dealConfirmedAt: hoursAgo(5) },
      { id: 'none', dealConfirmedAt: null }
    ])

    expect(await check()).toEqual({
      canReview: true,
      contactType: SellerReviewContactType.DEAL_CONFIRMED,
      conversationId: 'latest'
    })
    expect(prisma.message.groupBy).not.toHaveBeenCalled()
  })

  it('достаточная переписка спустя 48 часов — отзыв без подтверждения с привязкой к диалогу', async () => {
    prisma.conversation.findMany.mockResolvedValue([{ id: 'c1', dealConfirmedAt: null }])
    prisma.message.groupBy.mockResolvedValue(chatRows(4, 3, 60))

    expect(await check()).toEqual({
      canReview: true,
      contactType: SellerReviewContactType.CONTACT,
      conversationId: 'c1'
    })
    expect(prisma.message.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { conversationId: { in: ['c1'] }, senderId: { in: ['author', 'seller'] } } })
    )
  })

  it('переписка достаточная, но выдержка не прошла — отказ с датой', async () => {
    prisma.conversation.findMany.mockResolvedValue([{ id: 'c1', dealConfirmedAt: null }])
    prisma.message.groupBy.mockResolvedValue(chatRows(4, 3, 10))

    expect(await check()).toMatchObject({
      canReview: false,
      reason: SellerReviewBlockReason.ContactTooFresh,
      availableAt: new Date(hoursAgo(10).getTime() + 48 * HOUR)
    })
  })

  it('показанный телефон спустя 48 часов — отзыв без подтверждения, без диалога', async () => {
    prisma.adPhoneReveal.findFirst.mockResolvedValue({ createdAt: hoursAgo(49) })

    expect(await check()).toEqual({
      canReview: true,
      contactType: SellerReviewContactType.CONTACT,
      conversationId: null
    })
    expect(prisma.adPhoneReveal.findFirst).toHaveBeenCalledWith({
      where: { userId: 'author', sellerId: 'seller' },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true }
    })
  })

  it('пятый отзыв за сутки ещё можно, шестой — нет', async () => {
    prisma.adPhoneReveal.findFirst.mockResolvedValue({ createdAt: hoursAgo(49) })

    prisma.sellerReview.count.mockResolvedValue(4)
    expect((await check()).canReview).toBe(true)

    prisma.sellerReview.count.mockResolvedValue(5)
    expect(await check()).toMatchObject({ canReview: false, reason: SellerReviewBlockReason.DailyLimit })
    expect(prisma.sellerReview.count).toHaveBeenCalledWith({
      where: { authorId: 'author', createdAt: { gte: new Date(NOW.getTime() - DAY) } }
    })
  })
})
