'use client'

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { ISecurityEvent, ISecurityEventsPage } from '../types/security-event.types'

interface UseSecurityEventsInfiniteOptions<T extends ISecurityEvent> {
  queryKey: readonly unknown[]
  fetchPage: (page: number) => Promise<ISecurityEventsPage<T>>
  enabled?: boolean
}

// Общая "Показать ещё"-пагинация журнала для админки и для пользователя —
// отличаются только источник данных и ключ кэша. Список остаётся на
// экране, пока грузится другой фильтр (placeholderData) — иначе при
// переключении группы он на долю секунды схлопывался бы в пустоту, тот же
// приём, что в useAdminUsersSearch.
export function useSecurityEventsInfinite<T extends ISecurityEvent>({
  queryKey,
  fetchPage,
  enabled = true
}: UseSecurityEventsInfiniteOptions<T>) {
  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: lastPage => (lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined),
    placeholderData: keepPreviousData,
    enabled
  })

  const events = useMemo(() => query.data?.pages.flatMap(page => page.items) ?? [], [query.data])
  const total = query.data?.pages[0]?.total ?? 0

  return {
    events,
    total,
    isLoading: query.isLoading,
    isError: query.isError,
    // Фоновое обновление поверх уже показанного списка (смена фильтра) —
    // не то же самое, что первая загрузка (isLoading).
    isRefreshing: query.isFetching && !query.isFetchingNextPage && !query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage: query.fetchNextPage
  }
}
