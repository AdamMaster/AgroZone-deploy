'use client'

import { useQuery } from '@tanstack/react-query'

import { adsService } from '../services/ads.service'
import { IAd } from '../types/ad.types'

export function useGetFavorites(page = 1, limit = 20) {
  const query = useQuery<IAd[]>({
    queryKey: ['favorite-ads', page, limit],

    queryFn: () =>
      adsService.getFavorites({
        page,
        limit
      }),

    staleTime: 1000 * 60 * 5
  })

  return {
    favorites: query.data ?? [],
    isLoadingFavorites: query.isLoading,
    error: query.error,
    refetch: query.refetch
  }
}
