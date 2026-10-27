import { SellerReviewContactType } from '@/generated/prisma/enums'

import { computeReviewWeight } from './review-weight.util'

const NOW = new Date('2026-10-27T12:00:00.000Z')
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000)

describe('computeReviewWeight', () => {
  it('подтверждённая сделка от давнего аккаунта — полный вес', () => {
    expect(
      computeReviewWeight(SellerReviewContactType.DEAL_CONFIRMED, {
        accountCreatedAt: daysAgo(90),
        hasOtherActivity: false,
        now: NOW
      })
    ).toBe(1)
  })

  it('неподтверждённый контакт — малый вес 0,3', () => {
    expect(
      computeReviewWeight(SellerReviewContactType.CONTACT, {
        accountCreatedAt: daysAgo(90),
        hasOtherActivity: true,
        now: NOW
      })
    ).toBe(0.3)
  })

  it('молодой аккаунт без другой активности весит вдвое меньше', () => {
    expect(
      computeReviewWeight(SellerReviewContactType.DEAL_CONFIRMED, {
        accountCreatedAt: daysAgo(10),
        hasOtherActivity: false,
        now: NOW
      })
    ).toBe(0.5)
  })

  it('молодой аккаунт, но с другой активностью, — не штрафуется', () => {
    expect(
      computeReviewWeight(SellerReviewContactType.DEAL_CONFIRMED, {
        accountCreatedAt: daysAgo(10),
        hasOtherActivity: true,
        now: NOW
      })
    ).toBe(1)
  })

  it('аккаунту ровно 30 дней — уже не молодой', () => {
    expect(
      computeReviewWeight(SellerReviewContactType.DEAL_CONFIRMED, {
        accountCreatedAt: daysAgo(30),
        hasOtherActivity: false,
        now: NOW
      })
    ).toBe(1)
  })

  it('штраф и малый вес перемножаются', () => {
    expect(
      computeReviewWeight(SellerReviewContactType.CONTACT, {
        accountCreatedAt: daysAgo(8),
        hasOtherActivity: false,
        now: NOW
      })
    ).toBeCloseTo(0.15)
  })
})
