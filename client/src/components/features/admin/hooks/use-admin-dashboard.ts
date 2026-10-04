'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { adminDashboardService } from '../services/admin-dashboard.service'
import { DashboardPeriodDays } from '../types/admin-dashboard.types'

// Раз в минуту цифры обновляются сами, пока вкладка открыта (в фоновой
// вкладке react-query по умолчанию опрос не ведёт) — дашборд оставляют
// открытым, и "новые жалобы" не должны требовать F5. keepPreviousData: при
// переключении периода график не мигает "Загрузкой", а приглушается, пока
// не придёт новый ряд.
const REFETCH_INTERVAL_MS = 60_000

export function useAdminDashboard(days: DashboardPeriodDays) {
  const query = useQuery({
    queryKey: ['admin-dashboard', days],
    queryFn: () => adminDashboardService.get(days),
    placeholderData: keepPreviousData,
    refetchInterval: REFETCH_INTERVAL_MS
  })

  return {
    dashboard: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isRefreshing: query.isPlaceholderData
  }
}
