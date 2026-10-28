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

// Рейтинг в кабинете самого продавца. В отличие от публичного, среднее видно
// владельцу сразу (даже при одном-двух отзывах), а isPublic говорит, показан
// ли он уже другим пользователям: интерфейс объясняет, что рейтинг появится у
// остальных после порога, а не оставляет владельца гадать.
export interface OwnSellerRating extends PublicSellerRating {
  isPublic: boolean
}

export function buildOwnRating(stored: StoredSellerRating): OwnSellerRating {
  return {
    average: stored.ratingCount > 0 ? stored.ratingAverage : null,
    count: stored.ratingCount,
    isPublic: buildPublicRating(stored).average !== null
  }
}

// Как publicRatingFields: пока рейтинги выключены, поля нет вовсе.
export function ownRatingFields(
  stored: StoredSellerRating,
  isEnabled: boolean
): { rating: OwnSellerRating } | Record<string, never> {
  return isEnabled ? { rating: buildOwnRating(stored) } : {}
}
