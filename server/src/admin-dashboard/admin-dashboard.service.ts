import { Injectable } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { AdReportStatus, AdStatus, DealerFeedStatus } from '@/generated/prisma/enums'

import { PrismaService } from '@/prisma/prisma.service'

import { DASHBOARD_METRIC_KEYS, DASHBOARD_TIME_ZONE, PAYMENT_KINDS } from './constants/admin-dashboard.constants'
import {
  AdminDashboard,
  DashboardDayPoint,
  DashboardKindTotals,
  DashboardMetricKey,
  DashboardMetrics,
  DashboardPeriodMetrics,
  DashboardQueues,
  PaymentKind
} from './admin-dashboard.types'
import { buildDayKeys, startOfDayUtc } from './utils/dashboard-days.util'

interface DailyCountRow {
  day: string
  count: number | bigint
}

interface DailyPaymentRow extends DailyCountRow {
  kind: PaymentKind
  amount: number | bigint
}

// День события в часовом поясе дашборда. Колонки timestamp(3) без пояса
// хранят UTC (так пишет Prisma), поэтому сначала помечаем значение как UTC,
// а затем переводим в локальное время. Ключ группировки берём строкой
// 'YYYY-MM-DD' — ровно такой же, как отдаёт buildDayKeys.
const localDay = (column: Prisma.Sql) =>
  Prisma.sql`to_char((${column} AT TIME ZONE 'UTC') AT TIME ZONE ${DASHBOARD_TIME_ZONE}, 'YYYY-MM-DD')`

const emptyMetrics = (): DashboardMetrics =>
  Object.fromEntries(DASHBOARD_METRIC_KEYS.map(key => [key, 0])) as DashboardMetrics

const emptyKindTotals = (): Record<PaymentKind, DashboardKindTotals> =>
  Object.fromEntries(PAYMENT_KINDS.map(kind => [kind, { count: 0, amountKopecks: 0 }])) as Record<
    PaymentKind,
    DashboardKindTotals
  >

const pickMetrics = (point: DashboardDayPoint): DashboardMetrics =>
  Object.fromEntries(DASHBOARD_METRIC_KEYS.map(key => [key, point[key]])) as DashboardMetrics

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  // Сводка для стартовой страницы админки: очереди "на сейчас", показатели
  // за сегодня/вчера (для сравнения) и посуточный ряд за `days` дней.
  // Сегодня и вчера берутся из того же ряда — отдельных запросов под них
  // нет (days всегда >= 2, см. DASHBOARD_ALLOWED_PERIOD_DAYS).
  //
  // Доход — только оплаченные (SUCCEEDED) платежи ЮKassa четырёх видов.
  // Ручная выдача premium админом (PREMIUM_SET_BY_ADMIN) платежом не
  // является и сюда не попадает. Деньги, вернувшиеся пользователю, в
  // схеме не отслеживаются, поэтому это выручка до возвратов.
  async getDashboard(days: number, now: Date = new Date()): Promise<AdminDashboard> {
    const dayKeys = buildDayKeys(now, days)
    const from = startOfDayUtc(dayKeys[0])

    // Порядок первых четырёх запросов важен для юнит-тестов (они
    // отвечают на $queryRaw по очереди): регистрации, объявления, жалобы,
    // платежи.
    const [registrations, ads, reports, payments, queues] = await Promise.all([
      this.queryDailyCounts(Prisma.sql`SELECT ${localDay(Prisma.sql`created_at`)} AS day, COUNT(*) AS count
        FROM users WHERE created_at >= ${from.toISOString()}::timestamp GROUP BY 1`),
      // Черновики — не публикация: пользователь ещё ничего не подал.
      this.queryDailyCounts(Prisma.sql`SELECT ${localDay(Prisma.sql`created_at`)} AS day, COUNT(*) AS count
        FROM ads WHERE status <> 'DRAFT' AND created_at >= ${from.toISOString()}::timestamp GROUP BY 1`),
      this.queryDailyCounts(Prisma.sql`SELECT ${localDay(Prisma.sql`created_at`)} AS day, COUNT(*) AS count
        FROM ad_reports WHERE created_at >= ${from.toISOString()}::timestamp GROUP BY 1`),
      this.queryPayments(from),
      this.getQueues()
    ])

    const series = dayKeys.map<DashboardDayPoint>(date => ({ date, ...emptyMetrics() }))
    const pointByDay = new Map(series.map(point => [point.date, point]))
    const byKind = emptyKindTotals()

    const dailyCounts: Array<[DashboardMetricKey, DailyCountRow[]]> = [
      ['registrations', registrations],
      ['newAds', ads],
      ['newReports', reports]
    ]

    for (const [key, rows] of dailyCounts) {
      for (const row of rows) {
        const point = pointByDay.get(row.day)
        if (point) point[key] = Number(row.count)
      }
    }

    for (const row of payments) {
      const point = pointByDay.get(row.day)
      if (!point) continue

      const count = Number(row.count)
      const amount = Number(row.amount)

      point.paymentsCount += count
      point.revenueKopecks += amount
      byKind[row.kind].count += count
      byKind[row.kind].amountKopecks += amount
    }

    return {
      generatedAt: now.toISOString(),
      timeZone: DASHBOARD_TIME_ZONE,
      days,
      queues,
      today: pickMetrics(series[series.length - 1]),
      yesterday: pickMetrics(series[series.length - 2]),
      period: this.sumPeriod(series, byKind),
      series
    }
  }

  private sumPeriod(series: DashboardDayPoint[], byKind: DashboardPeriodMetrics['byKind']): DashboardPeriodMetrics {
    const total = emptyMetrics()

    for (const point of series) {
      for (const key of DASHBOARD_METRIC_KEYS) {
        total[key] += point[key]
      }
    }

    return { ...total, byKind }
  }

  private queryDailyCounts(query: Prisma.Sql) {
    return this.prisma.$queryRaw<DailyCountRow[]>(query)
  }

  // Четыре вида платежей лежат в разных таблицах (у каждого свой смысл —
  // см. комментарии к моделям), поэтому склеиваем их UNION ALL и
  // группируем по виду и дню одним запросом. Учитываем только SUCCEEDED с
  // проставленным paidAt — PENDING/CANCELED деньгами не являются.
  private queryPayments(from: Date) {
    const since = from.toISOString()

    return this.prisma.$queryRaw<DailyPaymentRow[]>(Prisma.sql`
      SELECT p.kind AS kind, ${localDay(Prisma.sql`p.paid_at`)} AS day, COUNT(*) AS count,
        COALESCE(SUM(p.amount), 0) AS amount
      FROM (
        SELECT 'bump' AS kind, paid_at, amount FROM ad_bumps
          WHERE status = 'SUCCEEDED' AND paid_at >= ${since}::timestamp
        UNION ALL
        SELECT 'premium', paid_at, amount FROM premium_purchases
          WHERE status = 'SUCCEEDED' AND paid_at >= ${since}::timestamp
        UNION ALL
        SELECT 'adServices', paid_at, amount FROM ad_service_purchases
          WHERE status = 'SUCCEEDED' AND paid_at >= ${since}::timestamp
        UNION ALL
        SELECT 'dealerSubscription', paid_at, amount FROM dealer_subscriptions
          WHERE status = 'SUCCEEDED' AND paid_at >= ${since}::timestamp
      ) p
      GROUP BY 1, 2
    `)
  }

  private async getQueues(): Promise<DashboardQueues> {
    const [adsPending, reportsPending, dealerFeedsPending] = await Promise.all([
      this.prisma.ad.aggregate({
        where: { status: AdStatus.PENDING },
        _count: { _all: true },
        _min: { createdAt: true }
      }),
      this.prisma.adReport.count({ where: { status: AdReportStatus.PENDING } }),
      this.prisma.dealerFeed.count({ where: { status: DealerFeedStatus.PENDING_REVIEW } })
    ])

    return {
      adsPending: adsPending._count._all,
      oldestAdPendingAt: adsPending._min.createdAt?.toISOString() ?? null,
      reportsPending,
      dealerFeedsPending
    }
  }
}
