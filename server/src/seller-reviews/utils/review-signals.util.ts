import {
  SELLER_REVIEW_SIGNAL_BURST_MIN_REVIEWS,
  SELLER_REVIEW_SIGNAL_RECIPROCAL_MIN,
  SELLER_REVIEW_SIGNAL_SHARED_IP_AUTHORS_MIN,
  SELLER_REVIEW_SIGNAL_UNCONFIRMED_SHARE,
  SELLER_REVIEW_SIGNAL_YOUNG_AUTHORS_SHARE,
  SELLER_REVIEW_SIGNALS_MIN_REVIEWS
} from '../constants/seller-reviews.constants'

// Сырые счётчики по отзывам продавца (без скрытых модератором).
export interface SellerReviewSignalCounts {
  totalReviews: number
  // Отзывы без подтверждённой сделки.
  unconfirmedReviews: number
  // Авторы моложе 30 дней на момент отзыва и без другой активности.
  youngAuthorReviews: number
  // Отзывы от тех, кого продавец оценил в ответ.
  reciprocalReviews: number
  // Больше всего отзывов за любые сутки подряд.
  maxReviewsInWindow: number
  // Авторы, у которых хоть раз был общий IP с самим продавцом.
  authorsSharingIpWithSeller: number
  // Авторы, у которых был общий IP с другим автором того же продавца.
  authorsSharingIpWithEachOther: number
}

export enum SellerReviewSignalCode {
  YoungAuthors = 'YOUNG_AUTHORS',
  MostlyUnconfirmed = 'MOSTLY_UNCONFIRMED',
  ReciprocalReviews = 'RECIPROCAL_REVIEWS',
  ReviewBurst = 'REVIEW_BURST',
  SharedIpWithSeller = 'SHARED_IP_WITH_SELLER',
  SharedIpAmongAuthors = 'SHARED_IP_AMONG_AUTHORS'
}

// Какие сигналы сработали. Доли считаются только от минимума отзывов:
// «все два отзыва от новичков» — не закономерность.
export function evaluateReviewSignals(counts: SellerReviewSignalCounts): SellerReviewSignalCode[] {
  const flagged: SellerReviewSignalCode[] = []
  const hasEnoughReviews = counts.totalReviews >= SELLER_REVIEW_SIGNALS_MIN_REVIEWS
  const share = (part: number) => (counts.totalReviews === 0 ? 0 : part / counts.totalReviews)

  if (hasEnoughReviews && share(counts.youngAuthorReviews) >= SELLER_REVIEW_SIGNAL_YOUNG_AUTHORS_SHARE) {
    flagged.push(SellerReviewSignalCode.YoungAuthors)
  }

  if (hasEnoughReviews && share(counts.unconfirmedReviews) >= SELLER_REVIEW_SIGNAL_UNCONFIRMED_SHARE) {
    flagged.push(SellerReviewSignalCode.MostlyUnconfirmed)
  }

  if (counts.reciprocalReviews >= SELLER_REVIEW_SIGNAL_RECIPROCAL_MIN) {
    flagged.push(SellerReviewSignalCode.ReciprocalReviews)
  }

  if (counts.maxReviewsInWindow >= SELLER_REVIEW_SIGNAL_BURST_MIN_REVIEWS) {
    flagged.push(SellerReviewSignalCode.ReviewBurst)
  }

  if (counts.authorsSharingIpWithSeller >= 1) {
    flagged.push(SellerReviewSignalCode.SharedIpWithSeller)
  }

  if (counts.authorsSharingIpWithEachOther >= SELLER_REVIEW_SIGNAL_SHARED_IP_AUTHORS_MIN) {
    flagged.push(SellerReviewSignalCode.SharedIpAmongAuthors)
  }

  return flagged
}
