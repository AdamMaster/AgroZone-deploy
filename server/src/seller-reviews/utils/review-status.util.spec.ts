import { SellerReviewFilterFlag, SellerReviewStatus } from '@/generated/prisma/enums'

import { resolveReviewStatus } from './review-status.util'

describe('resolveReviewStatus', () => {
  it('новый чистый отзыв публикуется', () => {
    expect(resolveReviewStatus({ current: null, flags: [], hasPendingReports: false })).toBe(
      SellerReviewStatus.PUBLISHED
    )
  })

  it('сработавший фильтр отправляет на проверку', () => {
    expect(resolveReviewStatus({ current: null, flags: [SellerReviewFilterFlag.LINK], hasPendingReports: false })).toBe(
      SellerReviewStatus.PENDING
    )
    expect(
      resolveReviewStatus({
        current: SellerReviewStatus.PUBLISHED,
        flags: [SellerReviewFilterFlag.PHONE],
        hasPendingReports: false
      })
    ).toBe(SellerReviewStatus.PENDING)
  })

  it('автор исправил текст, задержанный фильтром, — публикуется', () => {
    expect(resolveReviewStatus({ current: SellerReviewStatus.PENDING, flags: [], hasPendingReports: false })).toBe(
      SellerReviewStatus.PUBLISHED
    )
  })

  it('задержанный по жалобам остаётся на проверке, даже если текст чистый', () => {
    expect(resolveReviewStatus({ current: SellerReviewStatus.PENDING, flags: [], hasPendingReports: true })).toBe(
      SellerReviewStatus.PENDING
    )
  })

  it('опубликованный отзыв с жалобами ниже порога остаётся опубликованным', () => {
    expect(resolveReviewStatus({ current: SellerReviewStatus.PUBLISHED, flags: [], hasPendingReports: true })).toBe(
      SellerReviewStatus.PUBLISHED
    )
  })
})
