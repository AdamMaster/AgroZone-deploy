'use client'

import { useQuery } from '@tanstack/react-query'

import { adsService } from '../services'

export function usePendingAds() {
  const query = useQuery({
    queryKey: ['pending-ads'],
    queryFn: () => adsService.findPending()
  })

  return {
    pendingAds: query.data ?? [],
    isLoading: query.isLoading
  }
}
