'use client'

import { useQuery } from '@tanstack/react-query'

import { dealerFeedsService } from '../services'

export function useDealerFeed() {
  const query = useQuery({
    queryKey: ['dealer-feed'],
    queryFn: () => dealerFeedsService.getMine()
  })

  return {
    dealerFeed: query.data ?? null,
    isLoading: query.isLoading
  }
}
