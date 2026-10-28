// Значения — строго как в enum'ах на бэкенде (prisma/schema.prisma).
export enum SellerReviewStatus {
  Published = 'PUBLISHED',
  Hidden = 'HIDDEN',
  Pending = 'PENDING'
}

export enum SellerReviewContactType {
  DealConfirmed = 'DEAL_CONFIRMED',
  Contact = 'CONTACT'
}

export enum SellerReviewReportReason {
  Fake = 'FAKE',
  Abusive = 'ABUSIVE',
  Spam = 'SPAM',
  PersonalData = 'PERSONAL_DATA',
  Other = 'OTHER'
}

// Почему оставить отзыв нельзя (SellerReviewBlockReason на бэкенде). По коду
// выбираем, что показать вместо формы; готовый текст приходит в message.
export enum SellerReviewBlockReason {
  Self = 'SELF',
  SellerUnavailable = 'SELLER_UNAVAILABLE',
  Blocked = 'BLOCKED',
  AccountTooYoung = 'ACCOUNT_TOO_YOUNG',
  AlreadyReviewed = 'ALREADY_REVIEWED',
  NoContact = 'NO_CONTACT',
  ContactTooFresh = 'CONTACT_TOO_FRESH',
  DailyLimit = 'DAILY_LIMIT'
}

// Рейтинг продавца для показа. average == null, пока отзывов меньше порога
// показа (сейчас — пока нет ни одного): интерфейс тогда пишет «Пока нет
// оценок», а не звёзды. Поля нет вовсе, пока рейтинги выключены в админке.
export interface ISellerRating {
  average: number | null
  count: number
}

// Свой рейтинг в кабинете: владелец видит среднее сразу, а isPublic говорит,
// показан ли рейтинг уже другим пользователям (сейчас — после первого отзыва).
export interface IOwnSellerRating extends ISellerRating {
  isPublic: boolean
}

export interface ISellerReviewAuthor {
  id: string
  displayName: string | null
  picture: string | null
  // Автор удалил аккаунт: имя и фото уже убраны сервером.
  deletedAt: string | null
}

export interface ISellerReview {
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
  author: ISellerReviewAuthor
}

// Ответ GET /users/:id/reviews.
export interface ISellerReviewsResponse {
  items: ISellerReview[]
  nextCursor: string | null
  rating: ISellerRating
}

export type ISellerReviewEligibility =
  | { canReview: true; contactType: SellerReviewContactType; conversationId: string | null }
  | { canReview: false; reason: SellerReviewBlockReason; message: string; availableAt?: string }

// Ответ GET /users/:id/reviews/mine.
export interface IMySellerReview {
  review: ISellerReview | null
  eligibility: ISellerReviewEligibility
}

export interface ICreateSellerReviewDto {
  rating: number
  text?: string
}

export interface IUpdateSellerReviewDto {
  rating?: number
  text?: string
}

export interface IReportSellerReviewDto {
  reason: SellerReviewReportReason
  comment?: string
}
