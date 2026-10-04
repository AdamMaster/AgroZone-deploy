import {
  DashboardMetricKey,
  DashboardPaymentKind,
  DashboardPeriodDays
} from '../types/admin-dashboard.types'

export const DASHBOARD_PERIODS: Array<{ days: DashboardPeriodDays; label: string }> = [
  { days: 7, label: '7 дней' },
  { days: 30, label: '30 дней' },
  { days: 90, label: '90 дней' }
]

export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriodDays = 30

// Подписи видов дохода — в порядке вывода. Ключи совпадают с PAYMENT_KINDS
// на бэкенде.
export const DASHBOARD_PAYMENT_KINDS: Array<{ kind: DashboardPaymentKind; label: string }> = [
  { kind: 'bump', label: 'Поднятие объявлений' },
  { kind: 'adServices', label: 'Услуги продвижения' },
  { kind: 'premium', label: 'Premium' },
  { kind: 'dealerSubscription', label: 'Тарифы дилеров' }
]

// Что можно посмотреть на графике. Показатели разного масштаба (штуки и
// рубли) не смешиваются на одной оси — график всегда про один показатель,
// переключаются они выбором сверху.
export const DASHBOARD_CHART_METRICS: Array<{ key: DashboardMetricKey; label: string }> = [
  { key: 'revenueKopecks', label: 'Доход' },
  { key: 'paymentsCount', label: 'Оплаты' },
  { key: 'registrations', label: 'Регистрации' },
  { key: 'newAds', label: 'Объявления' },
  { key: 'newReports', label: 'Жалобы' }
]
