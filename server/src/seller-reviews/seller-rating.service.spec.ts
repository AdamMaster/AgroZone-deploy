import { SellerRatingService } from './seller-rating.service'

describe('SellerRatingService', () => {
  let service: SellerRatingService
  let tx: any

  beforeEach(() => {
    service = new SellerRatingService()
    tx = {
      $queryRaw: jest.fn(),
      user: { update: jest.fn().mockResolvedValue({}) }
    }
  })

  // Первый $queryRaw — блокировка строк, дальше по одному на пользователя.
  const mockRatings = (...rows: Array<{ count: number; average: number | null } | undefined>) => {
    tx.$queryRaw.mockResolvedValueOnce([])
    rows.forEach(row => tx.$queryRaw.mockResolvedValueOnce(row ? [row] : []))
  }

  it('пишет у продавца посчитанные среднее и количество', async () => {
    mockRatings({ count: 5, average: 4.2 })

    await service.recalculate(tx, ['seller'])

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'seller' },
      data: { ratingAverage: 4.2, ratingCount: 5 }
    })
  })

  it('без опубликованных отзывов рейтинг обнуляется', async () => {
    mockRatings({ count: 0, average: null })

    await service.recalculate(tx, ['seller'])

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'seller' },
      data: { ratingAverage: null, ratingCount: 0 }
    })
  })

  it('пустой ответ запроса тоже сбрасывает рейтинг, а не ломает пересчёт', async () => {
    mockRatings(undefined)

    await service.recalculate(tx, ['seller'])

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'seller' },
      data: { ratingAverage: null, ratingCount: 0 }
    })
  })

  it('пересчитывает продавца и автора отзыва в порядке id, дубли схлопывает: блокировка один раз, затем по запросу на человека', async () => {
    mockRatings({ count: 1, average: 5 }, { count: 2, average: 4 })

    await service.recalculate(tx, ['b-seller', 'a-author', 'b-seller'])

    expect(tx.$queryRaw).toHaveBeenCalledTimes(3)
    expect(tx.user.update.mock.calls.map(([arg]: any[]) => arg.where.id)).toEqual(['a-author', 'b-seller'])
  })
})
