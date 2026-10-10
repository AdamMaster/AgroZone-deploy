import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { profileQueryKey } from '@/features/auth/store/auth-store'

import { uniqueById } from '@/shared/utils/unique-by-id'

import { profileApi } from '../api/profile.api'
import type { SecurityEventGroup } from '../constants/security-events'

const PAGE_SIZE = 10

// Под префиксом профиля: при выходе удаляется вместе с ним (auth-store), а
// изменения профиля обновляют журнал сразу для всех фильтров.
export const securityEventsQueryKeyPrefix = [...profileQueryKey, 'security-events'] as const

// «Недавняя активность» — собственный журнал безопасности пользователя.
export function useSecurityEvents(group: SecurityEventGroup) {
  const query = useInfiniteQuery({
    queryKey: [...securityEventsQueryKeyPrefix, group.id],
    queryFn: ({ pageParam, signal }) =>
      profileApi.securityEvents({ page: pageParam, limit: PAGE_SIZE, types: group.types }, signal),
    initialPageParam: 1,
    getNextPageParam: lastPage => (lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined),
    // Сменили фильтр — пока грузится новый список, виден прежний (бледнее),
    // как на сайте, а не пустое место.
    placeholderData: keepPreviousData
  })

  const events = useMemo(() => uniqueById(query.data?.pages.map(page => page.items) ?? []), [query.data])

  return {
    events,
    total: query.data?.pages.at(-1)?.total ?? 0,
    isPending: query.isPending,
    isError: query.isError && !query.isFetchNextPageError,
    isRefreshing: query.isPlaceholderData,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch
  }
}
