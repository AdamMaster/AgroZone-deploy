'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { sellerReviewsAdminService } from '../services/seller-reviews-admin.service'

const PAGE_SIZE = 20

export const ADMIN_SELLER_REVIEWS_QUERY_KEY = ['admin-seller-reviews']

// Очередь модерации отзывов с пагинацией «Показать ещё». Решённые отзывы
// уходят из очереди, поэтому после решения очередь перезапрашивается целиком
// (см. useModerateSellerReview), а не дополняется.
export function useAdminSellerReviews() {
  const result = useInfiniteQuery({
    queryKey: ADMIN_SELLER_REVIEWS_QUERY_KEY,
    queryFn: ({ pageParam }) => sellerReviewsAdminService.findQueue({ page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: lastPage => (lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined)
  })

  const reviews = useMemo(() => result.data?.pages.flatMap(page => page.items) ?? [], [result.data])

  return {
    reviews,
    total: result.data?.pages[0]?.total ?? 0,
    isLoading: result.isLoading,
    isFetchingNextPage: result.isFetchingNextPage,
    hasNextPage: Boolean(result.hasNextPage),
    fetchNextPage: result.fetchNextPage
  }
}
