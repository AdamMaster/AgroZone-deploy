// Значения и структура — строго как в AdminDashboard на бэкенде
// (server/src/admin-dashboard/admin-dashboard.types.ts). Деньги — в копейках.

export type DashboardPeriodDays = 7 | 30 | 90

export type DashboardMetricKey = 'registrations' | 'newAds' | 'newReports' | 'paymentsCount' | 'revenueKopecks'

export type DashboardPaymentKind = 'bump' | 'premium' | 'adServices' | 'dealerSubscription'

export type IDashboardMetrics = Record<DashboardMetricKey, number>

export interface IDashboardDayPoint extends IDashboardMetrics {
  // 'yyyy-MM-dd' в часовом поясе дашборда (Москва).
  date: string
}

export interface IDashboardKindTotals {
  count: number
  amountKopecks: number
}

export interface IDashboardPeriodMetrics extends IDashboardMetrics {
  byKind: Record<DashboardPaymentKind, IDashboardKindTotals>
}

export interface IDashboardQueues {
  adsPending: number
  oldestAdPendingAt: string | null
  reportsPending: number
  dealerFeedsPending: number
}

export interface IAdminDashboard {
  generatedAt: string
  timeZone: string
  days: DashboardPeriodDays
  queues: IDashboardQueues
  today: IDashboardMetrics
  yesterday: IDashboardMetrics
  period: IDashboardPeriodMetrics
  series: IDashboardDayPoint[]
}
