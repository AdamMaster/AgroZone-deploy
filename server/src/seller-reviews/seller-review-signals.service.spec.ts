import { SellerReviewSignalCode } from './utils/review-signals.util'
import { SellerReviewSignalsService } from './seller-review-signals.service'

describe('SellerReviewSignalsService', () => {
  // Шесть запросов идут параллельно в порядке, заданном в сервисе.
  const mockRows = (rows: unknown[][]) => {
    const prisma = { $queryRaw: jest.fn() }
    rows.forEach(result => prisma.$queryRaw.mockResolvedValueOnce(result))
    return new SellerReviewSignalsService(prisma as never)
  }

  it('собирает счётчики из шести запросов и считает сработавшие сигналы', async () => {
    const service = mockRows([
      [{ total: 5, unconfirmed: 3 }],
      [{ count: 4 }],
      [{ count: 2 }],
      [{ count: 3 }],
      [{ count: 1 }],
      [{ count: 2 }]
    ])

    expect(await service.getSignals('seller')).toEqual({
      totalReviews: 5,
      unconfirmedReviews: 3,
      youngAuthorReviews: 4,
      reciprocalReviews: 2,
      maxReviewsInWindow: 3,
      authorsSharingIpWithSeller: 1,
      authorsSharingIpWithEachOther: 2,
      flagged: [
        SellerReviewSignalCode.YoungAuthors,
        SellerReviewSignalCode.ReciprocalReviews,
        SellerReviewSignalCode.SharedIpWithSeller,
        SellerReviewSignalCode.SharedIpAmongAuthors
      ]
    })
  })

  it('пустые результаты запросов — нули и ни одного сигнала', async () => {
    const service = mockRows([[], [], [], [], [], []])

    expect(await service.getSignals('seller')).toEqual({
      totalReviews: 0,
      unconfirmedReviews: 0,
      youngAuthorReviews: 0,
      reciprocalReviews: 0,
      maxReviewsInWindow: 0,
      authorsSharingIpWithSeller: 0,
      authorsSharingIpWithEachOther: 0,
      flagged: []
    })
  })
})
