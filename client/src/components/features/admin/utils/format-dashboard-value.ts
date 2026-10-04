import { formatKopecks } from '@/shared/utils'

import { DashboardMetricKey } from '../types/admin-dashboard.types'

// Единственное место, где решается, как показывать значение показателя
// дашборда: доход приходит в копейках и выводится рублями, остальное — целые
// штуки с разделителями разрядов.
export const formatDashboardValue = (key: DashboardMetricKey, value: number): string =>
  key === 'revenueKopecks' ? formatKopecks(value) : value.toLocaleString('ru-RU')
