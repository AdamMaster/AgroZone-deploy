// Правила жалоб на продавцов (мошенничество). Числа вынесены сюда, чтобы
// менять их без правки логики.

export const SELLER_REPORT_COMMENT_MAX_LENGTH = 1000
export const SELLER_REPORT_RESOLUTION_NOTE_MAX_LENGTH = 500

// Жалоб в сутки с одного аккаунта.
export const SELLER_REPORTS_PER_DAY_LIMIT = 5

// Столько независимых жалоб приостанавливают объявления продавца до решения
// модератора. «Независимая» — от аккаунта не моложе указанного возраста,
// иначе приостановку можно было бы устроить пачкой одноразовых аккаунтов.
export const SELLER_REPORTS_TO_SUSPEND_ADS = 3
export const SELLER_REPORTER_MIN_ACCOUNT_AGE_DAYS = 7

export const SELLER_REPORTS_QUEUE_PAGE_SIZE_DEFAULT = 20
export const SELLER_REPORTS_QUEUE_PAGE_SIZE_MAX = 50

// Сколько записей журнала мер показывать в карточке продавца.
export const SELLER_SANCTIONS_HISTORY_LIMIT = 50
