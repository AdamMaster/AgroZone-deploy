import { SellerReviewFilterFlag } from '@/generated/prisma/enums'

import { SellerReviewTextFilterService } from './seller-review-text-filter.service'

const LONG_TEXT = 'Заказывал у них комбикорм, всё привезли вовремя'

describe('SellerReviewTextFilterService', () => {
  let service: SellerReviewTextFilterService
  let prisma: { sellerReview: { findMany: jest.Mock } }

  beforeEach(() => {
    prisma = { sellerReview: { findMany: jest.fn().mockResolvedValue([]) } }
    service = new SellerReviewTextFilterService(prisma as never)
  })

  it('чистый уникальный текст — без флагов', async () => {
    expect(await service.detect(LONG_TEXT, 'author')).toEqual([])
  })

  it('без текста — без флагов и без запроса в базу', async () => {
    expect(await service.detect(null, 'author')).toEqual([])
    expect(prisma.sellerReview.findMany).not.toHaveBeenCalled()
  })

  it('правила по самому тексту работают вместе с проверкой повтора', async () => {
    const flags = await service.detect('Пишите t.me/agro_x, отличный продавец!!', 'author')

    expect(flags).toEqual([SellerReviewFilterFlag.LINK])
  })

  it('короткий текст повтором не считается и в базу не ходит', async () => {
    expect(await service.detect('Всё хорошо', 'author')).toEqual([])
    expect(prisma.sellerReview.findMany).not.toHaveBeenCalled()
  })

  it('тот же текст уже у двух других отзывов — повтор', async () => {
    prisma.sellerReview.findMany.mockResolvedValue([{ authorId: 'a' }, { authorId: 'b' }])

    expect(await service.detect(LONG_TEXT, 'author')).toEqual([SellerReviewFilterFlag.REPEATED_TEXT])
  })

  it('тот же текст у одного чужого отзыва — ещё не повтор', async () => {
    prisma.sellerReview.findMany.mockResolvedValue([{ authorId: 'a' }])

    expect(await service.detect(LONG_TEXT, 'author')).toEqual([])
  })

  it('автор вставил тот же текст в отзыв другому продавцу — повтор', async () => {
    prisma.sellerReview.findMany.mockResolvedValue([{ authorId: 'author' }])

    expect(await service.detect(LONG_TEXT, 'author')).toEqual([SellerReviewFilterFlag.REPEATED_TEXT])
  })

  it('при правке сам отзыв из сравнения исключается; регистр не важен', async () => {
    await service.detect(LONG_TEXT, 'author', 'r1')

    expect(prisma.sellerReview.findMany).toHaveBeenCalledWith({
      where: { text: { equals: LONG_TEXT, mode: 'insensitive' }, id: { not: 'r1' } },
      select: { authorId: true },
      take: 2
    })
  })
})
