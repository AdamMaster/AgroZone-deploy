'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { sellerReportsAdminService } from '../services/seller-reports-admin.service'

const PAGE_SIZE = 20

export const ADMIN_SELLER_REPORTS_QUERY_KEY = ['admin-seller-reports']
export const adminSellerReportCardQueryKey = (sellerId: string) => ['admin-seller-report-card', sellerId]

// Очередь продавцов с нерассмотренными жалобами, пагинация «Показать ещё».
export function useAdminSellerReports() {
  const result = useInfiniteQuery({
    queryKey: ADMIN_SELLER_REPORTS_QUERY_KEY,
    queryFn: ({ pageParam }) => sellerReportsAdminService.findQueue({ page: pageParam, limit: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: lastPage => (lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined)
  })

  const items = useMemo(() => result.data?.pages.flatMap(page => page.items) ?? [], [result.data])

  return {
    items,
    total: result.data?.pages[0]?.total ?? 0,
    isLoading: result.isLoading,
    isFetchingNextPage: result.isFetchingNextPage,
    hasNextPage: Boolean(result.hasNextPage),
    fetchNextPage: result.fetchNextPage
  }
}

// Карточка продавца для решения по жалобам.
export function useAdminSellerReportCard(sellerId: string) {
  const query = useQuery({
    queryKey: adminSellerReportCardQueryKey(sellerId),
    queryFn: () => sellerReportsAdminService.getCard(sellerId)
  })

  return { card: query.data, isLoading: query.isLoading, isError: query.isError }
}
