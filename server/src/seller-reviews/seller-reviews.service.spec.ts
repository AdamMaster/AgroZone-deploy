import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { SellerReviewContactType, SellerReviewStatus } from '@/generated/prisma/enums'

import { SellerReviewsService } from './seller-reviews.service'
import { SellerReviewBlockReason } from './seller-review-eligibility.types'

const NOW = new Date('2026-10-27T12:00:00.000Z')
const DAY = 24 * 60 * 60 * 1000

const author = { id: 'author', displayName: 'Иван', picture: null, deletedAt: null }
const reviewRow = (overrides: object = {}) => ({
  id: 'r1',
  rating: 5,
  text: 'Отличный продавец',
  contactType: SellerReviewContactType.DEAL_CONFIRMED,
  sellerReply: null,
  sellerReplyAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  author,
  ...overrides
})

describe('SellerReviewsService', () => {
  let service: SellerReviewsService
  let prisma: any
  let eligibilityService: any
  let ratingService: any

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)

    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({ ratingAverage: 4.5, ratingCount: 4, deletedAt: null }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ createdAt: new Date(NOW.getTime() - 100 * DAY) })
      },
      ad: { count: jest.fn().mockResolvedValue(0) },
      conversation: { count: jest.fn().mockResolvedValue(0) },
      sellerReview: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue(reviewRow()),
        update: jest.fn().mockResolvedValue(reviewRow()),
        delete: jest.fn().mockResolvedValue({})
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'c1' }])
    }
    prisma.$transaction = jest.fn(async (callback: any) => callback(prisma))

    eligibilityService = {
      check: jest.fn().mockResolvedValue({
        canReview: true,
        contactType: SellerReviewContactType.CONTACT,
        conversationId: 'c1'
      })
    }
    ratingService = { recalculate: jest.fn().mockResolvedValue(undefined) }

    service = new SellerReviewsService(prisma, eligibilityService, ratingService)
  })

  afterEach(() => jest.useRealTimers())

  describe('findForSeller', () => {
    it('отдаёт опубликованные отзывы и рейтинг продавца', async () => {
      prisma.sellerReview.findMany.mockResolvedValue([reviewRow({ id: 'r1' }), reviewRow({ id: 'r2' })])

      const result = await service.findForSeller('seller', { limit: 20 })

      expect(prisma.sellerReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sellerId: 'seller', status: SellerReviewStatus.PUBLISHED },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 21
        })
      )
      expect(result.items.map(item => item.id)).toEqual(['r1', 'r2'])
      expect(result.nextCursor).toBeNull()
      expect(result.rating).toEqual({ average: 4.5, count: 4 })
    })

    it('лишняя строка означает следующую страницу: отдаём limit штук и курсор на последнюю', async () => {
      prisma.sellerReview.findMany.mockResolvedValue([
        reviewRow({ id: 'r1' }),
        reviewRow({ id: 'r2' }),
        reviewRow({ id: 'r3' })
      ])

      const result = await service.findForSeller('seller', { limit: 2 })

      expect(result.items.map(item => item.id)).toEqual(['r1', 'r2'])
      expect(result.nextCursor).toBe('r2')
    })

    it('продолжает с курсора, пропуская сам курсор', async () => {
      await service.findForSeller('seller', { cursor: 'r2', limit: 2 })

      expect(prisma.sellerReview.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ cursor: { id: 'r2' }, skip: 1 })
      )
    })

    it('скрытые и ожидающие отзывы в выдачу не попадают — фильтр по статусу в самом запросе', async () => {
      await service.findForSeller('seller', {})

      expect(prisma.sellerReview.findMany.mock.calls[0][0].where.status).toBe(SellerReviewStatus.PUBLISHED)
    })

    it('у автора, удалившего аккаунт, имя и фото не показываются', async () => {
      const deletedAt = new Date('2026-10-01')
      prisma.sellerReview.findMany.mockResolvedValue([
        reviewRow({ author: { id: 'gone', displayName: 'Пётр', picture: 'https://cdn/p.jpg', deletedAt } })
      ])

      const { items } = await service.findForSeller('seller', {})

      expect(items[0].author).toEqual({ id: 'gone', displayName: null, picture: null, deletedAt })
    })

    it('продавца нет или он удалён — 404', async () => {
      prisma.user.findUnique.mockResolvedValue(null)
      await expect(service.findForSeller('seller', {})).rejects.toBeInstanceOf(NotFoundException)

      prisma.user.findUnique.mockResolvedValue({ ratingAverage: null, ratingCount: 0, deletedAt: new Date() })
      await expect(service.findForSeller('seller', {})).rejects.toBeInstanceOf(NotFoundException)
    })

    it('наружу не уходят вес, статус и диалог', async () => {
      prisma.sellerReview.findMany.mockResolvedValue([reviewRow()])

      const { items } = await service.findForSeller('seller', {})

      expect(Object.keys(items[0])).not.toEqual(expect.arrayContaining(['weight']))
      expect(items[0]).not.toHaveProperty('status')
      expect(items[0]).not.toHaveProperty('conversationId')
      const select = prisma.sellerReview.findMany.mock.calls[0][0].select
      expect(select).not.toHaveProperty('weight')
      expect(select).not.toHaveProperty('conversationId')
    })
  })

  describe('findMine', () => {
    it('отдаёт свой отзыв и допуск', async () => {
      prisma.sellerReview.findUnique.mockResolvedValue(reviewRow())

      const result = await service.findMine('author', 'seller')

      expect(result.review?.id).toBe('r1')
      expect(result.eligibility).toEqual(await eligibilityService.check())
    })

    it('отзыва нет — review: null', async () => {
      prisma.sellerReview.findUnique.mockResolvedValue(null)

      expect((await service.findMine('author', 'seller')).review).toBeNull()
    })
  })

  describe('create', () => {
    it('сохраняет отзыв с типом контакта и диалогом из допуска, пересчитывает рейтинг продавца и автора', async () => {
      await service.create('author', 'seller', { rating: 4, text: '  Хорошо  ' })

      expect(prisma.sellerReview.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            sellerId: 'seller',
            authorId: 'author',
            conversationId: 'c1',
            contactType: SellerReviewContactType.CONTACT,
            rating: 4,
            text: 'Хорошо',
            weight: 0.3
          }
        })
      )
      expect(ratingService.recalculate).toHaveBeenCalledWith(prisma, ['seller', 'author'])
    })

    it('текст из пробелов сохраняется как «без текста»', async () => {
      await service.create('author', 'seller', { rating: 5, text: '   ' })

      expect(prisma.sellerReview.create.mock.calls[0][0].data.text).toBeNull()
    })

    it('молодой аккаунт без другой активности даёт вдвое меньший вес', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ createdAt: new Date(NOW.getTime() - 8 * DAY) })

      await service.create('author', 'seller', { rating: 5 })

      expect(prisma.sellerReview.create.mock.calls[0][0].data.weight).toBeCloseTo(0.15)
    })

    it('другая активность автора (объявления или диалоги с другими) снимает штраф молодого аккаунта', async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue({ createdAt: new Date(NOW.getTime() - 8 * DAY) })
      prisma.conversation.count.mockResolvedValue(2)

      await service.create('author', 'seller', { rating: 5 })

      expect(prisma.sellerReview.create.mock.calls[0][0].data.weight).toBe(0.3)
      expect(prisma.conversation.count).toHaveBeenCalledWith({
        where: {
          type: 'AD',
          OR: [
            { buyerId: 'author', sellerId: { not: 'seller' } },
            { sellerId: 'author', buyerId: { not: 'seller' } }
          ]
        }
      })
    })

    it('отзыв с подтверждённой сделкой берёт блокировку диалога и получает полный вес', async () => {
      eligibilityService.check.mockResolvedValue({
        canReview: true,
        contactType: SellerReviewContactType.DEAL_CONFIRMED,
        conversationId: 'c1'
      })

      await service.create('author', 'seller', { rating: 5 })

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1)
      expect(prisma.sellerReview.create.mock.calls[0][0].data.weight).toBe(1)
    })

    it('продавец успел снять отметку о сделке — отзыв не создаётся', async () => {
      eligibilityService.check.mockResolvedValue({
        canReview: true,
        contactType: SellerReviewContactType.DEAL_CONFIRMED,
        conversationId: 'c1'
      })
      prisma.$queryRaw.mockResolvedValue([])

      await expect(service.create('author', 'seller', { rating: 5 })).rejects.toBeInstanceOf(ConflictException)

      expect(prisma.sellerReview.create).not.toHaveBeenCalled()
      expect(ratingService.recalculate).not.toHaveBeenCalled()
    })

    it('отзыв по телефону или переписке блокировку диалога не берёт', async () => {
      await service.create('author', 'seller', { rating: 5 })

      expect(prisma.$queryRaw).not.toHaveBeenCalled()
    })

    it.each([
      [SellerReviewBlockReason.SellerUnavailable, NotFoundException],
      [SellerReviewBlockReason.AlreadyReviewed, ConflictException],
      [SellerReviewBlockReason.NoContact, ForbiddenException],
      [SellerReviewBlockReason.ContactTooFresh, ForbiddenException],
      [SellerReviewBlockReason.Blocked, ForbiddenException],
      [SellerReviewBlockReason.DailyLimit, ForbiddenException],
      [SellerReviewBlockReason.Self, ForbiddenException],
      [SellerReviewBlockReason.AccountTooYoung, ForbiddenException]
    ])('отказ допуска %s превращается в нужную HTTP-ошибку без записи', async (reason, exception) => {
      eligibilityService.check.mockResolvedValue({ canReview: false, reason, message: 'нельзя' })

      await expect(service.create('author', 'seller', { rating: 5 })).rejects.toBeInstanceOf(exception)

      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('одновременный второй запрос упирается в уникальность и получает 409', async () => {
      prisma.sellerReview.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'test' })
      )

      await expect(service.create('author', 'seller', { rating: 5 })).rejects.toBeInstanceOf(ConflictException)
    })

    it('прочие ошибки базы не маскируются', async () => {
      prisma.sellerReview.create.mockRejectedValue(new Error('db down'))

      await expect(service.create('author', 'seller', { rating: 5 })).rejects.toThrow('db down')
    })
  })

  describe('update', () => {
    beforeEach(() => {
      prisma.sellerReview.findUnique.mockResolvedValue({
        authorId: 'author',
        sellerId: 'seller',
        status: SellerReviewStatus.PUBLISHED
      })
    })

    it('автор меняет оценку и текст, рейтинг пересчитывается', async () => {
      await service.update('r1', 'author', { rating: 2, text: ' Передумал ' })

      expect(prisma.sellerReview.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'r1' }, data: { rating: 2, text: 'Передумал' } })
      )
      expect(ratingService.recalculate).toHaveBeenCalledWith(prisma, ['seller', 'author'])
    })

    it('пустой текст стирает текст, оценку не трогает', async () => {
      await service.update('r1', 'author', { text: '' })

      expect(prisma.sellerReview.update.mock.calls[0][0].data).toEqual({ text: null })
    })

    it('ничего не прислали — 400, без записи', async () => {
      await expect(service.update('r1', 'author', {})).rejects.toBeInstanceOf(BadRequestException)
      expect(prisma.sellerReview.update).not.toHaveBeenCalled()
    })

    it('чужой отзыв выглядит как несуществующий', async () => {
      await expect(service.update('r1', 'stranger', { rating: 1 })).rejects.toBeInstanceOf(NotFoundException)
      expect(prisma.sellerReview.update).not.toHaveBeenCalled()
    })

    it('продавец не может править отзыв о себе', async () => {
      await expect(service.update('r1', 'seller', { rating: 1 })).rejects.toBeInstanceOf(NotFoundException)
    })

    it('скрытый модератором отзыв автор править не может', async () => {
      prisma.sellerReview.findUnique.mockResolvedValue({
        authorId: 'author',
        sellerId: 'seller',
        status: SellerReviewStatus.HIDDEN
      })

      await expect(service.update('r1', 'author', { rating: 1 })).rejects.toBeInstanceOf(ForbiddenException)
    })

    it('отзыва нет — 404', async () => {
      prisma.sellerReview.findUnique.mockResolvedValue(null)

      await expect(service.update('r1', 'author', { rating: 1 })).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('remove', () => {
    it('автор удаляет свой отзыв, рейтинг пересчитывается в той же транзакции', async () => {
      prisma.sellerReview.findUnique.mockResolvedValue({ authorId: 'author', sellerId: 'seller' })

      await service.remove('r1', 'author')

      expect(prisma.sellerReview.delete).toHaveBeenCalledWith({ where: { id: 'r1' } })
      expect(ratingService.recalculate).toHaveBeenCalledWith(prisma, ['seller', 'author'])
    })

    it('чужой отзыв удалить нельзя', async () => {
      prisma.sellerReview.findUnique.mockResolvedValue({ authorId: 'author', sellerId: 'seller' })

      await expect(service.remove('r1', 'seller')).rejects.toBeInstanceOf(NotFoundException)
      expect(prisma.sellerReview.delete).not.toHaveBeenCalled()
    })

    it('отзыва нет — 404', async () => {
      prisma.sellerReview.findUnique.mockResolvedValue(null)

      await expect(service.remove('r1', 'author')).rejects.toBeInstanceOf(NotFoundException)
    })
  })

  describe('reply', () => {
    beforeEach(() => {
      prisma.sellerReview.findUnique.mockResolvedValue({
        authorId: 'author',
        sellerId: 'seller',
        status: SellerReviewStatus.PUBLISHED
      })
    })

    it('продавец отвечает на отзыв о себе: текст и время сохранения', async () => {
      await service.reply('r1', 'seller', { text: '  Спасибо!  ' })

      expect(prisma.sellerReview.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'r1' }, data: { sellerReply: 'Спасибо!', sellerReplyAt: NOW } })
      )
    })

    it('ответ не меняет рейтинг', async () => {
      await service.reply('r1', 'seller', { text: 'Спасибо' })

      expect(ratingService.recalculate).not.toHaveBeenCalled()
    })

    it('пустой ответ — 400', async () => {
      await expect(service.reply('r1', 'seller', { text: '   ' })).rejects.toBeInstanceOf(BadRequestException)
      expect(prisma.sellerReview.update).not.toHaveBeenCalled()
    })

    it('автор отзыва отвечать на него не может — отзыв для него «не найден»', async () => {
      await expect(service.reply('r1', 'author', { text: 'Ответ' })).rejects.toBeInstanceOf(NotFoundException)
    })

    it('на скрытый отзыв ответить нельзя', async () => {
      prisma.sellerReview.findUnique.mockResolvedValue({
        authorId: 'author',
        sellerId: 'seller',
        status: SellerReviewStatus.PENDING
      })

      await expect(service.reply('r1', 'seller', { text: 'Ответ' })).rejects.toBeInstanceOf(ForbiddenException)
    })
  })
})
