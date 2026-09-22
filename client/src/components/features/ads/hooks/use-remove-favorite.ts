'use client'

import { InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services/ads.service'
import { IAd, IAdsListResponse } from '../types/ad.types'

export function useRemoveFavorite() {
  const queryClient = useQueryClient()

  const { mutate: removeFavorite, isPending: isRemovingFavorite } = useMutation({
    mutationKey: ['remove favorite'],

    mutationFn: (id: string) => adsService.removeFavorite(id),

    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['ads-infinite'] })
      await queryClient.cancelQueries({ queryKey: ['ad-public', id] })

      // См. комментарий в use-add-favorite.ts — карточки читают isFavorite
      // из useAdsInfinite, чей кэш живёт под ['ads-infinite', params] как
      // InfiniteData<IAdsListResponse>, а не под ['ads'] (несуществующий
      // ключ от старой неинфинитной useAds).
      const previousQueries = queryClient.getQueriesData<InfiniteData<IAdsListResponse>>({
        queryKey: ['ads-infinite']
      })

      previousQueries.forEach(([queryKey]) => {
        queryClient.setQueryData<InfiniteData<IAdsListResponse>>(queryKey, old => {
          if (!old) return old

          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              items: page.items.map(ad => (ad.id === id ? { ...ad, isFavorite: false } : ad))
            }))
          }
        })
      })

      // См. комментарий в use-add-favorite.ts — страница объявления читает
      // isFavorite из ['ad-public', id], а не из ['ads-infinite'].
      const previousAd = queryClient.getQueryData<IAd>(['ad-public', id])
      if (previousAd) {
        queryClient.setQueryData<IAd>(['ad-public', id], { ...previousAd, isFavorite: false })
      }

      return { previousQueries, previousAd }
    },

    onError: (err, id, context) => {
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, previousData]) => {
          queryClient.setQueryData(queryKey, previousData)
        })
      }

      if (context?.previousAd) {
        queryClient.setQueryData(['ad-public', id], context.previousAd)
      }

      toastMessageHandler(err)
    },

    onSuccess: () => {
      toast.success('Удалено из избранного')

      queryClient.invalidateQueries({ queryKey: ['ads-infinite'] })
      queryClient.invalidateQueries({ queryKey: ['favorite-ads'] })
    }
  })

  return { removeFavorite, isRemovingFavorite }
}
