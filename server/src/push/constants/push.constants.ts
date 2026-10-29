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
