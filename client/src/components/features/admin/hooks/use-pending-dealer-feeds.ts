'use client'

import { useQuery } from '@tanstack/react-query'

import { dealerFeedsAdminService } from '../services/dealer-feeds-admin.service'

export function usePendingDealerFeeds() {
  const query = useQuery({
    queryKey: ['admin-dealer-feeds-pending'],
    queryFn: () => dealerFeedsAdminService.findPending()
  })

  return {
    pendingDealerFeeds: query.data?.items ?? [],
    isLoading: query.isLoading
  }
}
