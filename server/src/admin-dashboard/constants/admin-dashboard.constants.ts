// Часовой пояс, в котором админ видит "сегодня" и границы дней на графике.
// Москва — потому что площадка российская и владелец работает по МСК: с UTC
// "сегодняшние" регистрации обнулялись бы в 03:00 по Москве, посреди дня.
// У Москвы нет перехода на летнее время (с 2014 года), поэтому смещение
// фиксированное — оно нужно, чтобы получить из ключа дня 'YYYY-MM-DD'
// границу периода в UTC, которую можно отдать в WHERE по индексу.
export const DASHBOARD_TIME_ZONE = 'Europe/Moscow'
export const DASHBOARD_UTC_OFFSET = '+03:00'

export const DASHBOARD_ALLOWED_PERIOD_DAYS = [7, 30, 90] as const
export const DASHBOARD_DEFAULT_PERIOD_DAYS = 30

// Виды платежей, которые считаются доходом. Значение — то, что приходит из
// SQL-запроса (см. AdminDashboardService.queryPayments), и ключ в ответе.
// Показатели, которые считаются по каждому дню (и суммируются за период).
export const DASHBOARD_METRIC_KEYS = [
  'registrations',
  'newAds',
  'newReports',
  'paymentsCount',
  'revenueKopecks'
] as const

export const PAYMENT_KINDS = ['bump', 'premium', 'adServices', 'dealerSubscription'] as const
