'use client'

import { useState } from 'react'

import { Skeleton } from '@/components/ui'

import { formatDateTime, formatKopecks } from '@/shared/utils'

import { DASHBOARD_PERIODS, DEFAULT_DASHBOARD_PERIOD } from '../constants/admin-dashboard.constants'
import { getAdminChipClassName } from '../constants/admin-ui.constants'
import { useAdminDashboard } from '../hooks'
import { DashboardPeriodDays, IAdminDashboard } from '../types/admin-dashboard.types'
import { DashboardChart } from './dashboard-chart'
import { DashboardRevenueBreakdown } from './dashboard-revenue-breakdown'
import { DashboardStatCard } from './dashboard-stat-card'

const SECTION_TITLE_CLASS = 'mb-3 text-lg font-semibold'

const getQueueCards = ({ queues }: IAdminDashboard) => [
  {
    title: 'Объявления на модерации',
    value: queues.adsPending,
    href: '/admin/moderation',
    hint: queues.oldestAdPendingAt ? `Самое старое — с ${formatDateTime(queues.oldestAdPendingAt)}` : 'Очередь пуста'
  },
  {
    title: 'Новые жалобы',
    value: queues.reportsPending,
    href: '/admin/reports',
    hint: queues.reportsPending > 0 ? 'Ждут решения' : 'Новых жалоб нет'
  },
  {
    title: 'Фиды дилеров на проверке',
    value: queues.dealerFeedsPending,
    href: '/admin/dealers',
    hint: queues.dealerFeedsPending > 0 ? 'Ждут проверки' : 'Нет фидов на проверке'
  }
]

const getTodayCards = ({ today, yesterday }: IAdminDashboard) => [
  {
    title: 'Регистрации',
    value: today.registrations.toLocaleString('ru-RU'),
    hint: `Вчера: ${yesterday.registrations.toLocaleString('ru-RU')}`
  },
  {
    title: 'Новые объявления',
    value: today.newAds.toLocaleString('ru-RU'),
    hint: `Вчера: ${yesterday.newAds.toLocaleString('ru-RU')}`
  },
  {
    title: 'Оплаты',
    value: today.paymentsCount.toLocaleString('ru-RU'),
    hint: `Вчера: ${yesterday.paymentsCount.toLocaleString('ru-RU')}`
  },
  {
    title: 'Доход',
    value: formatKopecks(today.revenueKopecks),
    hint: `Вчера: ${formatKopecks(yesterday.revenueKopecks)}`
  }
]

// Стартовая страница админки (/admin): что ждёт решения прямо сейчас,
// что произошло сегодня и как идут дела за выбранный период. Данные —
// AdminDashboardService на бэкенде; "сегодня" считается по Москве.
export const AdminDashboard = () => {
  const [days, setDays] = useState<DashboardPeriodDays>(DEFAULT_DASHBOARD_PERIOD)
  const { dashboard, isLoading, isError, isRefreshing } = useAdminDashboard(days)

  if (isLoading) {
    return (
      <div className='max-w-5xl py-6'>
        <Skeleton className='mb-3 h-6 w-48 bg-mist-700/40' />
        <div className='mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3'>
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className='h-24 bg-mist-700/40' />
          ))}
        </div>
        <Skeleton className='h-[320px] bg-mist-700/40' />
      </div>
    )
  }

  if (isError || !dashboard) {
    return <p className='py-6 text-sm text-mist-50'>Не удалось загрузить сводку. Попробуйте обновить страницу.</p>
  }

  return (
    <div className='max-w-5xl py-6 text-mist-50'>
      <h1 className='mb-6 text-xl font-semibold'>Обзор</h1>

      <h2 className={SECTION_TITLE_CLASS}>Требует внимания</h2>
      <div className='mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3'>
        {getQueueCards(dashboard).map(card => (
          <DashboardStatCard
            key={card.title}
            title={card.title}
            value={card.value.toLocaleString('ru-RU')}
            hint={card.hint}
            href={card.href}
            needsAttention={card.value > 0}
          />
        ))}
      </div>

      <h2 className={SECTION_TITLE_CLASS}>
        Сегодня <span className='ml-1 text-xs font-normal text-mist-400'>по московскому времени</span>
      </h2>
      <div className='mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4'>
        {getTodayCards(dashboard).map(card => (
          <DashboardStatCard key={card.title} title={card.title} value={card.value} hint={card.hint} />
        ))}
      </div>

      <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
        <h2 className='text-lg font-semibold'>Динамика</h2>
        <div className='flex gap-1'>
          {DASHBOARD_PERIODS.map(period => (
            <button
              key={period.days}
              type='button'
              className={getAdminChipClassName(period.days === days)}
              onClick={() => setDays(period.days)}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      <div className='mb-8 rounded-md bg-mist-700/30 p-4'>
        <DashboardChart series={dashboard.series} isRefreshing={isRefreshing} />
      </div>

      <h2 className={SECTION_TITLE_CLASS}>
        Доход за период <span className='ml-1 text-sm font-normal text-mist-300'>{formatKopecks(dashboard.period.revenueKopecks)}</span>
      </h2>
      <div className='mb-6 rounded-md bg-mist-700/30 p-4'>
        <DashboardRevenueBreakdown period={dashboard.period} />
      </div>

      <p className='text-xs text-mist-400'>
        Доход — оплаченные платежи ЮKassa до возвратов. Ручная выдача premium администратором в доход не входит.
      </p>
    </div>
  )
}
