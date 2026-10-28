'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { useSiteFlags } from '@/components/features/site-settings/hooks'

import { sellerReviewsService } from '../services/seller-reviews.service'

export const SELLER_REVIEWS_KEY = 'seller-reviews'
export const MY_SELLER_REVIEW_KEY = 'my-seller-review'

// Публичный список отзывов с накоплением страниц («Показать ещё»). Запрашивается
// только при включённых рейтингах: иначе сервер отвечает 404.
export function useSellerReviews(sellerId: string) {
  const { sellerRatings } = useSiteFlags()

  const query = useInfiniteQuery({
    queryKey: [SELLER_REVIEWS_KEY, sellerId],
    queryFn: ({ pageParam }) => sellerReviewsService.findForSeller(sellerId, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
    enabled: sellerRatings
  })

  return {
    reviews: query.data?.pages.flatMap(page => page.items) ?? [],
    // Рейтинг и счётчик одинаковы во всех страницах — берём из первой.
    rating: query.data?.pages[0]?.rating,
    isLoading: query.isPending && sellerRatings,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch
  }
}

// Свой отзыв этому продавцу и можно ли оставить новый. Только для вошедших.
export function useMySellerReview(sellerId: string, isAuthorized: boolean) {
  const { sellerRatings } = useSiteFlags()

  return useQuery({
    queryKey: [MY_SELLER_REVIEW_KEY, sellerId],
    queryFn: () => sellerReviewsService.findMine(sellerId),
    enabled: sellerRatings && isAuthorized,
    // Допуск зависит от времени и действий продавца (выдержка 48 часов,
    // «сделка состоялась»), поэтому не держим его в кеше дольше нужного.
    staleTime: 0
  })
}
