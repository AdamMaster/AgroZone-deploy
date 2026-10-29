'use client'

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { useDebouncedValue } from '@/shared/hooks'

import { registrationAttemptsAdminService } from '../services/registration-attempts-admin.service'
import {
  RegistrationAttemptChannel,
  RegistrationAttemptFilter,
  RegistrationAttemptPlatform
} from '../types/admin.types'

const PAGE_SIZE = 20
const DEBOUNCE_MS = 300

// Журнал попыток регистрации с фильтрами и «Показать ещё». По умолчанию —
// только проблемные (ошибки и брошенные на полпути): ради них раздел и нужен.
export function useAdminRegistrationAttempts() {
  const [filter, setFilter] = useState<RegistrationAttemptFilter>('problems')
  const [channel, setChannel] = useState<RegistrationAttemptChannel | undefined>()
  const [platform, setPlatform] = useState<RegistrationAttemptPlatform | undefined>()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, DEBOUNCE_MS)

  const result = useInfiniteQuery({
    queryKey: ['admin-registration-attempts', filter, channel, platform, debouncedSearch],
    queryFn: ({ pageParam }) =>
      registrationAttemptsAdminService.find({
        filter,
        channel,
        platform,
        search: debouncedSearch.trim() || undefined,
        page: pageParam,
        limit: PAGE_SIZE
      }),
    initialPageParam: 1,
    getNextPageParam: lastPage => (lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined),
    placeholderData: keepPreviousData
  })

  const attempts = useMemo(() => result.data?.pages.flatMap(page => page.items) ?? [], [result.data])

  return {
    filter,
    setFilter,
    channel,
    setChannel,
    platform,
    setPlatform,
    search,
    setSearch,
    attempts,
    total: result.data?.pages[0]?.total ?? 0,
    summary: result.data?.pages[0]?.summary,
    isLoading: result.isLoading,
    isError: result.isError,
    isRefetching: result.isFetching && !result.isFetchingNextPage && !result.isLoading,
    isFetchingNextPage: result.isFetchingNextPage,
    hasNextPage: Boolean(result.hasNextPage),
    fetchNextPage: result.fetchNextPage,
    refetch: result.refetch
  }
}
