import { formatKopecks, pluralizeRu } from '@/shared/utils'

import { DASHBOARD_PAYMENT_KINDS } from '../constants/admin-dashboard.constants'
import { IDashboardPeriodMetrics } from '../types/admin-dashboard.types'

interface DashboardRevenueBreakdownProps {
  period: IDashboardPeriodMetrics
}

// Из чего сложился доход за период: сколько принёс каждый вид платных услуг.
// Полоса показывает долю в общем доходе; число оплат и сумма — текстом, так
// что цвет ничего не кодирует сам по себе.
export const DashboardRevenueBreakdown = ({ period }: DashboardRevenueBreakdownProps) => {
  if (period.revenueKopecks === 0) {
    return <p className='text-sm text-mist-300'>За выбранный период оплат не было.</p>
  }

  return (
    <ul className='flex flex-col gap-3'>
      {DASHBOARD_PAYMENT_KINDS.map(({ kind, label }) => {
        const { count, amountKopecks } = period.byKind[kind]
        const share = Math.round((amountKopecks / period.revenueKopecks) * 100)

        return (
          <li key={kind}>
            <div className='flex items-baseline justify-between gap-3 text-sm'>
              <span>{label}</span>
              <span className='tabular-nums'>
                {formatKopecks(amountKopecks)}
                <span className='ml-2 text-xs text-mist-400'>
                  {count} {pluralizeRu(count, ['оплата', 'оплаты', 'оплат'])} · {share}%
                </span>
              </span>
            </div>
            <div className='mt-1 h-1.5 rounded-full bg-mist-700/60'>
              <div className='h-full rounded-full bg-(--chart-1)' style={{ width: `${share}%` }} />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
