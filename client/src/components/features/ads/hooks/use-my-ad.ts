'use client'

import { useQuery } from '@tanstack/react-query'

import { adsService } from '../services'

export function useMyAd(id: string) {
  const { data, isLoading } = useQuery({
    queryKey: ['ad', id],
    queryFn: () => adsService.findOneForOwner(id),
    enabled: !!id
  })

  return { ad: data, isLoading }
}
