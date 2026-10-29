// Срок хранения журнала попыток регистрации (RegistrationAttempt). Там лежат
// телефон/почта и IP людей, которые могли так и не зарегистрироваться, — по
// 152-ФЗ бессрочно держать это нельзя. 90 дней хватает, чтобы заметить сбой
// и связаться с человеком. Если меняете срок — обновите и формулировку в
// Политике конфиденциальности (client/src/app/(main)/privacy/page.tsx).
export const REGISTRATION_ATTEMPTS_RETENTION_DAYS = 90

// Незавершённая попытка старше этого окна считается новой, а не продолжением:
// человек вернулся через полдня — это уже другая попытка.
export const REGISTRATION_ATTEMPT_REUSE_WINDOW_MS = 6 * 60 * 60 * 1000

// Попытка, которая «в процессе» и не двигалась дольше этого срока, в админке
// показывается как брошенная. Звонок подтверждается ≤5 минут, ссылка из письма
// живёт час, поэтому по прошествии часа ждать уже нечего.
export const REGISTRATION_ATTEMPT_ABANDON_AFTER_MS = 60 * 60 * 1000

// Сколько записей удаляем за один заход очистки (как у журнала безопасности).
export const REGISTRATION_ATTEMPTS_PURGE_BATCH_SIZE = 5000

export const REGISTRATION_ATTEMPTS_PAGE_SIZE_DEFAULT = 20
export const REGISTRATION_ATTEMPTS_PAGE_SIZE_MAX = 100

// Текст ошибки провайдера и User-Agent приходят снаружи и ничем не
// ограничены — режем, чтобы не раздувать таблицу.
export const REGISTRATION_ATTEMPT_MAX_DETAIL_LENGTH = 300
export const REGISTRATION_ATTEMPT_MAX_USER_AGENT_LENGTH = 512

// Сколько дней показывает сводка в шапке страницы админки.
export const REGISTRATION_ATTEMPTS_SUMMARY_DAYS = 7
