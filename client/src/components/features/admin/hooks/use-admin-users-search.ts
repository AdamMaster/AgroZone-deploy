'use client'

import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'

import { useDebouncedValue } from '@/shared/hooks'

import { usersAdminService } from '../services/users-admin.service'

const PAGE_SIZE = 20
const DEBOUNCE_MS = 300

// Поиск + пагинация "Показать ещё" для /admin/users. Пустая строка поиска
// — не пустое состояние, а весь список пользователей (см.
// UserService.searchByAdmin на бэкенде: query.length === 0 → без фильтра),
// последние зарегистрированные сверху — так админ может просто зайти на
// вкладку и увидеть недавних пользователей, не обязательно сразу вбивая
// запрос.
export function useAdminUsersSearch() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, DEBOUNCE_MS)

  const result = useInfiniteQuery({
    queryKey: ['admin-users-search', debouncedQuery],
    queryFn: ({ pageParam }) => usersAdminService.search({ query: debouncedQuery, page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: lastPage => (lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined),
    // Держим предыдущую страницу результатов на экране, пока грузится новая
    // (после того как поменялся дебаунснутый запрос) — без этого список на
    // каждое изменение запроса на долю секунды схлопывался в пустоту: для
    // react-query новый debouncedQuery — это новый queryKey, и без
    // placeholderData он сбрасывает data в undefined на время фетча.
    placeholderData: keepPreviousData
  })

  const users = useMemo(() => result.data?.pages.flatMap(page => page.items) ?? [], [result.data])
  const total = result.data?.pages[0]?.total ?? 0

  return {
    query,
    setQuery,
    users,
    total,
    // isLoading — только самая первая загрузка, когда данных ещё не было
    // вообще. isRefetching — фоновое обновление поверх уже показанных
    // (ещё не устаревших для глаза, хоть и предыдущих) результатов, см.
    // placeholderData выше — список остаётся на экране, а не мигает.
    isLoading: result.isLoading,
    isRefetching: result.isFetching && !result.isFetchingNextPage && !result.isLoading,
    isFetchingNextPage: result.isFetchingNextPage,
    hasNextPage: Boolean(result.hasNextPage),
    fetchNextPage: result.fetchNextPage
  }
}
