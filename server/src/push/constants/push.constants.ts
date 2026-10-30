// Лимиты на токен: токен RuStore — строка порядка сотни символов; с запасом, но
// без возможности залить в базу произвольный объём.
export const PUSH_TOKEN_MIN_LENGTH = 10
export const PUSH_TOKEN_MAX_LENGTH = 1024
export const PUSH_APP_VERSION_MAX_LENGTH = 32

// Сколько ждём ответа RuStore: отправка идёт фоном и не должна повисать.
export const PUSH_SEND_TIMEOUT_MS = 10_000

// Превью сообщения в самом уведомлении (на экране блокировки всё равно
// обрезается системой).
export const PUSH_BODY_MAX_LENGTH = 120

// Серия сообщений от одного человека подряд — один пуш, а не десять: пока
// получатель не прочёл предыдущее, новые в течение этого времени не звонят.
export const PUSH_CONVERSATION_COOLDOWN_MS = 60 * 1000

// Идентификатор установки приложения (UUID с запасом).
export const PUSH_INSTALLATION_ID_MIN_LENGTH = 8
export const PUSH_INSTALLATION_ID_MAX_LENGTH = 64

// Сколько живёт сообщение FCM, если телефон выключен или без сети.
export const FCM_MESSAGE_TTL_SECONDS = 24 * 60 * 60

// Запас до истечения OAuth-токена Google, при котором берём новый.
export const FCM_TOKEN_REFRESH_MARGIN_MS = 60 * 1000
