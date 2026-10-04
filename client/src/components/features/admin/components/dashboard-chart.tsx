'use client'

import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Button, ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui'

import { formatShortDate } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { DASHBOARD_CHART_METRICS } from '../constants/admin-dashboard.constants'
import { ADMIN_BUTTON_CLASS, getAdminChipClassName } from '../constants/admin-ui.constants'
import { DashboardMetricKey, IDashboardDayPoint } from '../types/admin-dashboard.types'
import { formatDashboardValue } from '../utils/format-dashboard-value'
import { DashboardSeriesTable } from './dashboard-series-table'

interface DashboardChartProps {
  series: IDashboardDayPoint[]
  isRefreshing: boolean
}

// Подпись на оси Y сокращённая ("12 тыс."), точное значение — в подсказке.
// Для дохода переводим копейки в рубли.
const formatAxisTick = (key: DashboardMetricKey, value: number) =>
  (key === 'revenueKopecks' ? value / 100 : value).toLocaleString('ru-RU', { notation: 'compact' })

export const DashboardChart = ({ series, isRefreshing }: DashboardChartProps) => {
  const [metricKey, setMetricKey] = useState<DashboardMetricKey>(DASHBOARD_CHART_METRICS[0].key)
  const [isTableView, setIsTableView] = useState(false)

  const metric = DASHBOARD_CHART_METRICS.find(item => item.key === metricKey) ?? DASHBOARD_CHART_METRICS[0]
  const chartConfig = { value: { label: metric.label, color: 'var(--chart-1)' } } satisfies ChartConfig
  const chartData = series.map(point => ({ date: point.date, value: point[metric.key] }))

  return (
    <div>
      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <div className='flex flex-wrap gap-1'>
          {DASHBOARD_CHART_METRICS.map(item => (
            <button
              key={item.key}
              type='button'
              className={getAdminChipClassName(item.key === metric.key)}
              onClick={() => setMetricKey(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <Button type='button' size='sm' className={ADMIN_BUTTON_CLASS} onClick={() => setIsTableView(prev => !prev)}>
          {isTableView ? 'График' : 'Таблица'}
        </Button>
      </div>

      <div className={cn('transition-opacity', isRefreshing && 'opacity-60')}>
        {isTableView ? (
          <DashboardSeriesTable series={series} />
        ) : (
          <ChartContainer config={chartConfig} className='aspect-auto h-[260px] w-full justify-start'>
            <BarChart data={chartData} barCategoryGap='15%'>
              <CartesianGrid vertical={false} stroke='rgba(255, 255, 255, 0.08)' />
              <XAxis
                dataKey='date'
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={16}
                tickFormatter={formatShortDate}
                tick={{ fill: 'var(--muted-foreground)' }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                width={40}
                tickMargin={4}
                tickFormatter={(value: number) => formatAxisTick(metric.key, value)}
                tick={{ fill: 'var(--muted-foreground)' }}
              />
              <ChartTooltip
                cursor={{ fill: 'rgba(255, 255, 255, 0.06)' }}
                isAnimationActive={false}
                content={
                  <ChartTooltipContent
                    className='border-mist-600 bg-mist-900 text-mist-50'
                    labelFormatter={(_, payload) => formatShortDate(payload?.[0]?.payload?.date ?? '')}
                    formatter={value => (
                      <div className='flex w-full items-center justify-between gap-4'>
                        <span className='text-mist-300'>{metric.label}</span>
                        <span className='font-mono font-medium tabular-nums'>
                          {formatDashboardValue(metric.key, Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Bar dataKey='value' name={metric.label} fill='var(--color-value)' radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ChartContainer>
        )}
      </div>
    </div>
  )
}
