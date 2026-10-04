// Срок хранения записей журнала безопасности (см. UserSecurityEvent). IP и
// устройство — персональные данные по 152-ФЗ, хранить их бессрочно нельзя;
// год — разумный баланс между "успеть расследовать спор, о котором
// пользователь вспомнил не сразу" и принципом минимизации данных. Значение
// можно переопределить переменной окружения SECURITY_EVENTS_RETENTION_DAYS
// (см. SecurityEventsService.getRetentionDays) без правки кода. Если
// меняете срок — обновите и формулировку в Политике конфиденциальности.
export const SECURITY_EVENTS_DEFAULT_RETENTION_DAYS = 365

// Сколько записей удаляем за один заход очистки — чтобы ночная чистка не
// держала долгую блокировку и не тянула в память десятки тысяч id разом.
export const SECURITY_EVENTS_PURGE_BATCH_SIZE = 5000

// User-Agent приходит от клиента и ничем не ограничен — режем, чтобы
// злонамеренно длинный заголовок не раздувал таблицу.
export const SECURITY_EVENTS_MAX_USER_AGENT_LENGTH = 512

export const SECURITY_EVENTS_DEFAULT_PAGE_SIZE = 20
export const SECURITY_EVENTS_MAX_PAGE_SIZE = 100
