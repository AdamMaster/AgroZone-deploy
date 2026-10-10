import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useAuthStore } from '@/features/auth/store/auth-store'

import { uniqueById } from '@/shared/utils/unique-by-id'

import { adsApi } from '../api/ads.api'

const PAGE_SIZE = 20

// Под префиксом ['ads'] — при входе/выходе список сбрасывается вместе с
// остальными объявлениями (см. auth-store).
export const favoritesQueryKey = ['ads', 'favorites'] as const

// Избранное текущего пользователя. Сервер отдаёт страницу без общего числа,
// поэтому следующая страница есть, пока приходят полные страницы.
export function useFavoritesInfinite() {
  const isSignedIn = useAuthStore(state => state.status === 'signedIn')

  const query = useInfiniteQuery({
    queryKey: favoritesQueryKey,
    queryFn: ({ pageParam, signal }) => adsApi.fetchFavorites({ page: pageParam, limit: PAGE_SIZE, signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _pages, lastPageParam) =>
      lastPage.length === PAGE_SIZE ? lastPageParam + 1 : undefined,
    enabled: isSignedIn
  })

  const favorites = useMemo(() => uniqueById(query.data?.pages ?? []), [query.data])

  return {
    favorites,
    error: query.error,
    isPending: query.isPending,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch
  }
}
