import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { useSiteFlags } from '@/features/site-settings/hooks/use-site-flags'

import { uniqueById } from '@/shared/utils/unique-by-id'

import { sellerReviewsApi } from '../api/seller-reviews.api'

export const sellerReviewsQueryKey = (sellerId: string) => ['seller-reviews', sellerId] as const
export const mySellerReviewQueryKey = (sellerId: string) => ['my-seller-review', sellerId] as const

// Публичный список отзывов с накоплением страниц по курсору. Запрашивается
// только при включённых рейтингах: иначе сервер отвечает 404.
export function useSellerReviews(sellerId: string) {
  const { sellerRatings } = useSiteFlags()

  const query = useInfiniteQuery({
    queryKey: sellerReviewsQueryKey(sellerId),
    queryFn: ({ pageParam, signal }) => sellerReviewsApi.fetchForSeller(sellerId, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    enabled: sellerRatings
  })

  const reviews = useMemo(() => uniqueById(query.data?.pages.map(page => page.items) ?? []), [query.data])

  return {
    reviews,
    // Рейтинг и счётчик одинаковы во всех страницах — берём из первой.
    rating: query.data?.pages[0]?.rating,
    error: query.error,
    isPending: query.isPending,
    isError: query.isError,
    isFetchNextPageError: query.isFetchNextPageError,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch
  }
}

// Свой отзыв этому продавцу и можно ли оставить новый. Только для вошедших.
export function useMySellerReview(sellerId: string, enabled: boolean) {
  const { sellerRatings } = useSiteFlags()

  return useQuery({
    queryKey: mySellerReviewQueryKey(sellerId),
    queryFn: ({ signal }) => sellerReviewsApi.fetchMine(sellerId, signal),
    enabled: sellerRatings && enabled,
    // Допуск зависит от времени и действий продавца (выдержка 48 часов,
    // «сделка состоялась»), поэтому не держим его в кеше дольше нужного.
    staleTime: 0
  })
}
