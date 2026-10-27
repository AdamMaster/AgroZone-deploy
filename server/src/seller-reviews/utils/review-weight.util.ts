import { SellerReviewContactType } from '@/generated/prisma/enums'

import {
  MS_PER_DAY,
  SELLER_REVIEW_BASE_WEIGHT,
  SELLER_REVIEW_ESTABLISHED_ACCOUNT_AGE_DAYS,
  SELLER_REVIEW_LOW_TRUST_FACTOR
} from '../constants/seller-reviews.constants'

export interface AuthorTrustInput {
  accountCreatedAt: Date
  // Есть ли у автора другая активность на площадке: собственные объявления
  // или диалоги с другими пользователями (не с оцениваемым продавцом).
  hasOtherActivity: boolean
  now: Date
}

// Вес отзыва без учёта взаимности: базовый вес по типу контакта на
// коэффициент доверия к автору. Молодой аккаунт (меньше месяца) без другой
// активности — только что созданный ради этого отзыва — весит вдвое меньше.
export function computeReviewWeight(contactType: SellerReviewContactType, author: AuthorTrustInput): number {
  const accountAgeDays = (author.now.getTime() - author.accountCreatedAt.getTime()) / MS_PER_DAY
  const isLowTrust = accountAgeDays < SELLER_REVIEW_ESTABLISHED_ACCOUNT_AGE_DAYS && !author.hasOtherActivity

  return SELLER_REVIEW_BASE_WEIGHT[contactType] * (isLowTrust ? SELLER_REVIEW_LOW_TRUST_FACTOR : 1)
}
