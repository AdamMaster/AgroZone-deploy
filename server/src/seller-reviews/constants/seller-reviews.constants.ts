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
// оценок». Как на Авито, рейтинг виден уже после первого отзыва; от накрутки
// защищают не порог, а выдержка, возраст аккаунта, подтверждение сделки,
// веса взаимных отзывов и модерация.
export const SELLER_RATING_MIN_REVIEWS_TO_SHOW = 1

export const SELLER_REVIEWS_PAGE_SIZE_DEFAULT = 20
export const SELLER_REVIEWS_PAGE_SIZE_MAX = 50

// Модерация. Отзыв с текстом, повторяющимся не меньше стольких раз (у любых
// авторов), уходит на проверку: так выглядит рассылка одного заготовленного
// отзыва. Короткие тексты («Всё хорошо») повторяются честно, их не учитываем.
export const SELLER_REVIEW_REPEATED_TEXT_MIN_LENGTH = 20
export const SELLER_REVIEW_REPEATED_TEXT_THRESHOLD = 2

// Жалобы на отзыв. Отзыв уходит на проверку сам, когда жалуются столько
// независимых пользователей; «независимый» — аккаунт не моложе указанного
// возраста, иначе пачку жалоб можно сделать с одноразовых аккаунтов.
export const SELLER_REVIEW_REPORTS_TO_HIDE = 3
export const SELLER_REVIEW_REPORTER_MIN_ACCOUNT_AGE_DAYS = 7
export const SELLER_REVIEW_REPORTS_PER_DAY_LIMIT = 10
export const SELLER_REVIEW_REPORT_COMMENT_MAX_LENGTH = 1000

export const SELLER_REVIEW_MODERATION_PAGE_SIZE_DEFAULT = 20
export const SELLER_REVIEW_MODERATION_PAGE_SIZE_MAX = 50

// Сигналы накрутки в карточке продавца. Это пороги подсветки, а не
// приговор: сигнал только привлекает внимание модератора. Малое число отзывов
// ничего не доказывает, поэтому доли считаются, начиная с минимума.
export const SELLER_REVIEW_SIGNALS_MIN_REVIEWS = 3
export const SELLER_REVIEW_SIGNAL_YOUNG_AUTHORS_SHARE = 0.5
export const SELLER_REVIEW_SIGNAL_UNCONFIRMED_SHARE = 0.8
export const SELLER_REVIEW_SIGNAL_RECIPROCAL_MIN = 2
export const SELLER_REVIEW_SIGNAL_BURST_WINDOW_HOURS = 24
export const SELLER_REVIEW_SIGNAL_BURST_MIN_REVIEWS = 5
export const SELLER_REVIEW_SIGNAL_SHARED_IP_AUTHORS_MIN = 2

export const MS_PER_DAY = 24 * 60 * 60 * 1000
