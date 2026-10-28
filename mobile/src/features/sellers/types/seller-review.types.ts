// Значения — строго как в enum'ах на бэкенде (prisma/schema.prisma), как и
// у типов сайта (sellers/types/seller-review.types.ts).
export type SellerReviewStatus = 'PUBLISHED' | 'PENDING' | 'HIDDEN'

export type SellerReviewContactType = 'DEAL_CONFIRMED' | 'CONTACT'

export type SellerReviewReportReason = 'FAKE' | 'ABUSIVE' | 'SPAM' | 'PERSONAL_DATA' | 'OTHER'

export type SellerReportReason = 'PREPAYMENT_SCAM' | 'FAKE_AD' | 'STOLEN_PHOTOS' | 'DIFFERENT_ITEM' | 'OTHER'

// Почему оставить отзыв нельзя (SellerReviewBlockReason на бэкенде). Готовый
// текст для пользователя приходит в message; по коду выбираем, нужно ли
// вообще что-то показывать.
export type SellerReviewBlockReason =
  | 'SELF'
  | 'SELLER_UNAVAILABLE'
  | 'BLOCKED'
  | 'ACCOUNT_TOO_YOUNG'
  | 'ALREADY_REVIEWED'
  | 'NO_CONTACT'
  | 'CONTACT_TOO_FRESH'
  | 'DAILY_LIMIT'

// Рейтинг продавца для показа. average == null, пока нет ни одного отзыва
// (порог показа задаёт сервер): интерфейс тогда пишет «Пока нет оценок». Поля
// нет вовсе, пока рейтинги выключены в админке.
export interface SellerRating {
  average: number | null
  count: number
}

// Свой рейтинг в кабинете: владелец видит среднее сразу, а isPublic говорит,
// показан ли рейтинг уже другим пользователям.
export interface OwnSellerRating extends SellerRating {
  isPublic: boolean
}

export interface SellerReviewAuthor {
  id: string
  displayName: string | null
  picture: string | null
  // Автор удалил аккаунт: имя и фото уже убраны сервером.
  deletedAt: string | null
}

export interface SellerReview {
  id: string
  rating: number
  text: string | null
  contactType: SellerReviewContactType
  // В публичной выдаче всегда PUBLISHED; автор свой отзыв видит и со статусом
  // PENDING («на проверке»).
  status: SellerReviewStatus
  sellerReply: string | null
  sellerReplyAt: string | null
  createdAt: string
  updatedAt: string
  author: SellerReviewAuthor
}

// Ответ GET /users/:id/reviews.
export interface SellerReviewsPage {
  items: SellerReview[]
  nextCursor: string | null
  rating: SellerRating
}

export type SellerReviewEligibility =
  | { canReview: true; contactType: SellerReviewContactType; conversationId: string | null }
  | { canReview: false; reason: SellerReviewBlockReason; message: string; availableAt?: string }

// Ответ GET /users/:id/reviews/mine.
export interface MySellerReview {
  review: SellerReview | null
  eligibility: SellerReviewEligibility
}

export interface SellerReviewInput {
  rating: number
  text?: string
}
