// Лимиты — как на сервере (seller-reviews.constants.ts): там они проверяются
// по-настоящему, здесь нужны только для счётчика и maxLength поля.
export const SELLER_REVIEW_TEXT_MAX_LENGTH = 1000
export const SELLER_REVIEW_REPLY_MAX_LENGTH = 1000
export const SELLER_REVIEW_REPORT_COMMENT_MAX_LENGTH = 1000
export const SELLER_REPORT_COMMENT_MAX_LENGTH = 1000

// Рейтинг показывается у продавца от стольких отзывов (сервер отдаёт
// average: null ниже порога) — число нужно только для подсказки.
export const SELLER_RATING_MIN_REVIEWS_TO_SHOW = 3

export const RATING_LABELS: Record<number, string> = {
  1: 'Ужасно',
  2: 'Плохо',
  3: 'Нормально',
  4: 'Хорошо',
  5: 'Отлично'
}
