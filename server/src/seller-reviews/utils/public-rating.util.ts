import { SELLER_RATING_MIN_REVIEWS_TO_SHOW } from '../constants/seller-reviews.constants'

// Что хранится у продавца (User.ratingAverage / ratingCount).
export interface StoredSellerRating {
  ratingAverage: number | null
  ratingCount: number
}

// Что видят сайт и приложение. average — null, пока отзывов меньше порога:
// интерфейс в этом случае показывает «Пока нет оценок», а не звёзды.
export interface PublicSellerRating {
  average: number | null
  count: number
}

export function buildPublicRating(stored: StoredSellerRating): PublicSellerRating {
  const isShown = stored.ratingAverage !== null && stored.ratingCount >= SELLER_RATING_MIN_REVIEWS_TO_SHOW

  return { average: isShown ? stored.ratingAverage : null, count: stored.ratingCount }
}

// Поля рейтинга для ответа с продавцом. Пока рейтинги выключены в админке,
// возвращает пустой объект: в ответе нет не только значения, но и самого
// ключа `rating` — клиенту нечего показывать и нечего скрывать.
export function publicRatingFields(
  stored: StoredSellerRating,
  isEnabled: boolean
): { rating: PublicSellerRating } | Record<string, never> {
  return isEnabled ? { rating: buildPublicRating(stored) } : {}
}
