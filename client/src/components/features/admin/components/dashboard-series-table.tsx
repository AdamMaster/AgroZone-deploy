import { formatShortDate } from '@/shared/utils'

import { DASHBOARD_CHART_METRICS } from '../constants/admin-dashboard.constants'
import { IDashboardDayPoint } from '../types/admin-dashboard.types'
import { formatDashboardValue } from '../utils/format-dashboard-value'

interface DashboardSeriesTableProps {
  series: IDashboardDayPoint[]
}

// Те же данные, что и на графике, но числами — для точных значений и для
// тех, кому график читать неудобно. Новые дни сверху.
export const DashboardSeriesTable = ({ series }: DashboardSeriesTableProps) => (
  <div className='max-h-[360px] overflow-auto rounded-md'>
    <table className='w-full text-sm'>
      <thead className='sticky top-0 bg-mist-800 text-left text-xs text-mist-400'>
        <tr>
          <th className='px-3 py-2 font-medium'>Дата</th>
          {DASHBOARD_CHART_METRICS.map(metric => (
            <th key={metric.key} className='px-3 py-2 text-right font-medium'>
              {metric.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[...series].reverse().map(point => (
          <tr key={point.date} className='border-t border-mist-700/50'>
            <td className='px-3 py-1.5'>{formatShortDate(point.date)}</td>
            {DASHBOARD_CHART_METRICS.map(metric => (
              <td key={metric.key} className='px-3 py-1.5 text-right tabular-nums'>
                {formatDashboardValue(metric.key, point[metric.key])}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
