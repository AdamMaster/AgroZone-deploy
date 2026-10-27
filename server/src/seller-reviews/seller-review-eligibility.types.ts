import { SellerReviewContactType } from '@/generated/prisma/enums'

// Почему оставить отзыв нельзя. Клиент по коду выбирает, что показать
// (форму, подсказку «отзыв можно оставить после …» или ничего), а message —
// готовый текст на случай, когда отдельной подсказки нет.
export const SellerReviewBlockReason = {
  Self: 'SELF',
  SellerUnavailable: 'SELLER_UNAVAILABLE',
  Blocked: 'BLOCKED',
  AccountTooYoung: 'ACCOUNT_TOO_YOUNG',
  AlreadyReviewed: 'ALREADY_REVIEWED',
  NoContact: 'NO_CONTACT',
  ContactTooFresh: 'CONTACT_TOO_FRESH',
  DailyLimit: 'DAILY_LIMIT'
} as const

export type SellerReviewBlockReason = (typeof SellerReviewBlockReason)[keyof typeof SellerReviewBlockReason]

export type SellerReviewEligibility =
  | { canReview: true; contactType: SellerReviewContactType; conversationId: string | null }
  | { canReview: false; reason: SellerReviewBlockReason; message: string; availableAt?: Date }
