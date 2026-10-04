import { DASHBOARD_METRIC_KEYS, PAYMENT_KINDS } from './constants/admin-dashboard.constants'

export type PaymentKind = (typeof PAYMENT_KINDS)[number]
export type DashboardMetricKey = (typeof DASHBOARD_METRIC_KEYS)[number]

// Показатели одного периода (день или весь выбранный диапазон). Деньги — в
// копейках, как и во всех таблицах платежей: форматирование в рубли — дело
// клиента, чтобы сумма не проходила через плавающую точку на сервере.
export type DashboardMetrics = Record<DashboardMetricKey, number>

export interface DashboardDayPoint extends DashboardMetrics {
  // Ключ календарного дня 'YYYY-MM-DD' в часовом поясе дашборда.
  date: string
}

export interface DashboardKindTotals {
  count: number
  amountKopecks: number
}

export interface DashboardPeriodMetrics extends DashboardMetrics {
  byKind: Record<PaymentKind, DashboardKindTotals>
}

// "Очереди" — состояние на сейчас, а не за период: сколько всего ждёт
// решения модератора прямо сейчас, независимо от выбранного диапазона.
export interface DashboardQueues {
  adsPending: number
  // Когда создано самое старое объявление в очереди модерации — по нему
  // видно, не "зависла" ли очередь, даже если в ней всего несколько штук.
  oldestAdPendingAt: string | null
  reportsPending: number
  dealerFeedsPending: number
}

export interface AdminDashboard {
  generatedAt: string
  timeZone: string
  days: number
  queues: DashboardQueues
  today: DashboardMetrics
  yesterday: DashboardMetrics
  period: DashboardPeriodMetrics
  series: DashboardDayPoint[]
}
