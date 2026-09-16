'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { adsService } from '../services'

const PAGE_SIZE = 20

// Список объявлений пользователя на его карточке в админке
// (/admin/users/:id) — "Показать ещё", тот же принцип, что и у
// useAdsInfinite (каталог), но без initialData: карточка открывается сразу
// на клиенте, SSR тут не участвует.
export function useAdminUserAds(userId: string) {
  const query = useInfiniteQuery({
    queryKey: ['admin-user-ads', userId],
    queryFn: ({ pageParam }) => adsService.findByUserForAdmin(userId, { page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: lastPage => (lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined),
    enabled: Boolean(userId)
  })

  const ads = useMemo(() => query.data?.pages.flatMap(page => page.items) ?? [], [query.data])
  const total = query.data?.pages[0]?.total ?? 0

  return {
    ads,
    total,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: Boolean(query.hasNextPage),
    fetchNextPage: query.fetchNextPage
  }
}
