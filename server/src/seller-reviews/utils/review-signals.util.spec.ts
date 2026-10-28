import { SellerReviewSignalCode, SellerReviewSignalCounts, evaluateReviewSignals } from './review-signals.util'

const clean: SellerReviewSignalCounts = {
  totalReviews: 10,
  unconfirmedReviews: 2,
  youngAuthorReviews: 1,
  reciprocalReviews: 0,
  maxReviewsInWindow: 2,
  authorsSharingIpWithSeller: 0,
  authorsSharingIpWithEachOther: 0
}

describe('evaluateReviewSignals', () => {
  it('обычный продавец — ни одного сигнала', () => {
    expect(evaluateReviewSignals(clean)).toEqual([])
  })

  it('нет отзывов — ни одного сигнала', () => {
    expect(
      evaluateReviewSignals({
        totalReviews: 0,
        unconfirmedReviews: 0,
        youngAuthorReviews: 0,
        reciprocalReviews: 0,
        maxReviewsInWindow: 0,
        authorsSharingIpWithSeller: 0,
        authorsSharingIpWithEachOther: 0
      })
    ).toEqual([])
  })

  it('половина отзывов от новичков без активности', () => {
    expect(evaluateReviewSignals({ ...clean, youngAuthorReviews: 5 })).toEqual([SellerReviewSignalCode.YoungAuthors])
  })

  it('почти все отзывы без подтверждённой сделки', () => {
    expect(evaluateReviewSignals({ ...clean, unconfirmedReviews: 8 })).toEqual([
      SellerReviewSignalCode.MostlyUnconfirmed
    ])
  })

  it('доли не считаются, пока отзывов меньше минимума: два отзыва из двух — не закономерность', () => {
    expect(evaluateReviewSignals({ ...clean, totalReviews: 2, youngAuthorReviews: 2, unconfirmedReviews: 2 })).toEqual(
      []
    )
  })

  it('два взаимных отзыва', () => {
    expect(evaluateReviewSignals({ ...clean, reciprocalReviews: 2 })).toEqual([
      SellerReviewSignalCode.ReciprocalReviews
    ])
    expect(evaluateReviewSignals({ ...clean, reciprocalReviews: 1 })).toEqual([])
  })

  it('пять отзывов за сутки', () => {
    expect(evaluateReviewSignals({ ...clean, maxReviewsInWindow: 5 })).toEqual([SellerReviewSignalCode.ReviewBurst])
    expect(evaluateReviewSignals({ ...clean, maxReviewsInWindow: 4 })).toEqual([])
  })

  it('общий IP автора с продавцом — достаточно одного', () => {
    expect(evaluateReviewSignals({ ...clean, authorsSharingIpWithSeller: 1 })).toEqual([
      SellerReviewSignalCode.SharedIpWithSeller
    ])
  })

  it('общий IP между авторами — от двух', () => {
    expect(evaluateReviewSignals({ ...clean, authorsSharingIpWithEachOther: 2 })).toEqual([
      SellerReviewSignalCode.SharedIpAmongAuthors
    ])
    expect(evaluateReviewSignals({ ...clean, authorsSharingIpWithEachOther: 1 })).toEqual([])
  })

  it('несколько сигналов сразу', () => {
    expect(
      evaluateReviewSignals({ ...clean, reciprocalReviews: 3, maxReviewsInWindow: 6, authorsSharingIpWithSeller: 2 })
    ).toEqual([
      SellerReviewSignalCode.ReciprocalReviews,
      SellerReviewSignalCode.ReviewBurst,
      SellerReviewSignalCode.SharedIpWithSeller
    ])
  })
})
