// Правила отзывов о продавцах. Числа вынесены сюда, чтобы менять их без
// правки логики и без миграции данных (веса применяются при пересчёте
// рейтинга, см. SellerRatingService).

export const SELLER_REVIEW_RATING_MIN = 1
export const SELLER_REVIEW_RATING_MAX = 5
export const SELLER_REVIEW_TEXT_MAX_LENGTH = 1000
export const SELLER_REVIEW_REPLY_MAX_LENGTH = 1000

// Сколько отзывов подряд автор может написать за сутки (создание, не правка).
export const SELLER_REVIEWS_PER_DAY_LIMIT = 5
export const SELLER_REVIEWS_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000

// Аккаунт моложе не может оставлять отзывы.
export const SELLER_REVIEW_MIN_ACCOUNT_AGE_DAYS = 7

// Контакт без подтверждения сделки: переписка, в которой писали обе стороны
// не меньше стольких сообщений каждая, и выдержка после первого ответа
// продавца; либо показанный телефон и та же выдержка.
export const SELLER_REVIEW_CHAT_MIN_MESSAGES_PER_SIDE = 3
export const SELLER_REVIEW_CONTACT_COOLDOWN_MS = 48 * 60 * 60 * 1000

// Вес отзыва в рейтинге: подтверждённая сделка — полный, неподтверждённый
// контакт — малый.
export const SELLER_REVIEW_BASE_WEIGHT = {
  DEAL_CONFIRMED: 1,
  CONTACT: 0.3
} as const

// Автор — молодой аккаунт без другой активности: его отзыв весит вдвое
// меньше. Такие аккаунты — типичный способ накрутки.
export const SELLER_REVIEW_ESTABLISHED_ACCOUNT_AGE_DAYS = 30
export const SELLER_REVIEW_LOW_TRUST_FACTOR = 0.5

// Взаимные отзывы (А оценил Б и Б оценил А) весят вдвое меньше — обе
// стороны, потому что договорённость об обмене оценками выглядит так же,
// как честный обмен.
export const SELLER_REVIEW_RECIPROCAL_FACTOR = 0.5

// Рейтинг показывается у продавца от этого числа отзывов, иначе «Пока нет
// оценок». Один-два отзыва ничего не говорят о продавце, зато легко
// подделываются.
export const SELLER_RATING_MIN_REVIEWS_TO_SHOW = 3

export const SELLER_REVIEWS_PAGE_SIZE_DEFAULT = 20
export const SELLER_REVIEWS_PAGE_SIZE_MAX = 50

export const MS_PER_DAY = 24 * 60 * 60 * 1000
