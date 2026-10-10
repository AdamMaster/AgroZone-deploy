import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useAuthStore } from '@/features/auth/store/auth-store'

import { uniqueById } from '@/shared/utils/unique-by-id'

import { myAdsApi } from '../api/my-ads.api'
import { MY_ADS_TABS, type MyAdsTab } from '../constants/my-ads-tabs'

const PAGE_SIZE = 20

// Под префиксом ['ads']: при входе и выходе сбрасываются вместе с
// остальными объявлениями (см. auth-store).
export const myAdsQueryKeyPrefix = ['ads', 'my'] as const

// Вкладки с числом объявлений в каждой. Пустые вкладки не показываются —
// как на сайте.
export function useMyAdsTabs() {
  const isSignedIn = useAuthStore(state => state.status === 'signedIn')

  const query = useQuery({
    queryKey: [...myAdsQueryKeyPrefix, 'status-counts'],
    queryFn: ({ signal }) => myAdsApi.fetchStatusCounts(signal),
    enabled: isSignedIn
  })

  const tabs = useMemo(() => {
    const counts = query.data
    if (!counts) return []

    return MY_ADS_TABS.map(tab => ({
      ...tab,
      count: tab.statuses.reduce((sum, status) => sum + counts[status], 0)
    })).filter(tab => tab.count > 0)
  }, [query.data])

  return {
    tabs,
    error: query.error,
    isPending: query.isPending,
    refetch: query.refetch
  }
}

// Объявления одной вкладки. Сервер отдаёт страницу без общего числа —
// следующая страница есть, пока приходят полные.
export function useMyAdsList(tab: MyAdsTab | undefined) {
  const isSignedIn = useAuthStore(state => state.status === 'signedIn')

  const query = useInfiniteQuery({
    queryKey: [...myAdsQueryKeyPrefix, 'list', tab?.key],
    queryFn: ({ pageParam, signal }) =>
      myAdsApi.fetchMyAds({ statuses: tab!.statuses, page: pageParam, limit: PAGE_SIZE, signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length === PAGE_SIZE ? lastPageParam + 1 : undefined,
    enabled: isSignedIn && !!tab
  })

  const ads = useMemo(() => uniqueById(query.data?.pages ?? []), [query.data])

  return {
    ads,
    error: query.error,
    isPending: query.isPending,
    isFetchingNextPage: query.isFetchingNextPage,
    isFetchNextPageError: query.isFetchNextPageError,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    // Пока вкладка не известна (счётчики ещё грузятся или объявлений нет),
    // запрашивать нечего: refetch у react-query игнорирует enabled.
    refetch: tab ? query.refetch : skipRefetch
  }
}

const skipRefetch = () => Promise.resolve()
