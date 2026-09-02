'use client'

import { useQuery } from '@tanstack/react-query'

import { adsService } from '../services/ads.service'
import { IAd } from '../types/ad.types'

export function useMyAds() {
  const { data, isLoading } = useQuery<IAd[]>({
    // Указываем, что ожидаем массив Ad
    queryKey: ['my-ads'],
    queryFn: () => adsService.findMyAds()
  })

  return { ads: data || [], isLoading }
}
