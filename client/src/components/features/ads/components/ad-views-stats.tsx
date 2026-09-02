'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import {
  Button,
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Heading,
  Skeleton
} from '@/components/ui'

import { cn } from '@/lib/utils'

import { useAdViewStats } from '../hooks'

interface AdViewsStatsProps {
  adId: string
}

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const chartConfig = {
  views: {
    label: 'Просмотры',
    color: 'var(--chart-1)'
  }
} satisfies ChartConfig

const formatShortDate = (isoDate: string) => {
  const [, month, day] = isoDate.split('-')
  return `${day}.${month}`
}

export const AdViewsStats = ({ adId }: AdViewsStatsProps) => {
  const [weekOffset, setWeekOffset] = useState(0)
  const { stats, isLoading, isFetching } = useAdViewStats(adId, weekOffset)

  const chartData = (stats?.days ?? []).map((day, index) => ({
    ...day,
    label: WEEKDAY_LABELS[index]
  }))

  const canGoBack = !stats || weekOffset < stats.maxWeekOffset
  const canGoForward = weekOffset > 0

  return (
    <div className='sm:custom-shadow mb-5 rounded-3xl sm:bg-white sm:p-6 dark:bg-transparent dark:sm:bg-neutral-700'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <Heading level={4}>Просмотры</Heading>

        <div className='flex items-center gap-1'>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-8'
            disabled={!canGoBack || isLoading}
            onClick={() => setWeekOffset(prev => prev + 1)}
            aria-label='Предыдущая неделя'
          >
            <ChevronLeft className='size-4' />
          </Button>
          <span className='min-w-[100px] text-center text-sm text-gray-500'>
            {stats ? `${formatShortDate(stats.weekStart)} – ${formatShortDate(stats.weekEnd)}` : ' '}
          </span>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-8'
            disabled={!canGoForward || isLoading}
            onClick={() => setWeekOffset(prev => Math.max(prev - 1, 0))}
            aria-label='Следующая неделя'
          >
            <ChevronRight className='size-4' />
          </Button>
        </div>
      </div>

      <p className='mb-4 text-sm text-gray-500'>
        За неделю: <span className='text-lg font-semibold text-gray-900'>{stats?.total ?? 0}</span>
      </p>

      {isLoading ? (
        <Skeleton className='h-[220px] w-full rounded-xl' />
      ) : (
        <ChartContainer
          config={chartConfig}
          className={cn('aspect-auto h-[180px] w-full transition-opacity sm:h-[280px]', isFetching && 'opacity-50')}
        >
          <BarChart data={chartData} barCategoryGap={20}>
            <CartesianGrid vertical={false} strokeDasharray='3 3' />
            <XAxis
              dataKey='label'
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{ fill: 'var(--muted-foreground)' }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={24}
              tickMargin={4}
              tick={{ fill: 'var(--muted-foreground)' }}
            />
            <ChartTooltip
              cursor={false}
              isAnimationActive={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) => formatShortDate(payload?.[0]?.payload?.date ?? '')}
                />
              }
            />
            <Bar maxBarSize={50} dataKey='views' fill='#bed9ff' radius={[6, 6, 0, 0]} activeBar={false} />
          </BarChart>
        </ChartContainer>
      )}
    </div>
  )
}
