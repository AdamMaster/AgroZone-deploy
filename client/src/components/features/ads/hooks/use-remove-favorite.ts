'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
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
      await queryClient.cancelQueries({ queryKey: ['ads'] })
      await queryClient.cancelQueries({ queryKey: ['ad-public', id] })

      // Кэш под ['ads', params] — это IAdsListResponse, не голый массив
      // (см. use-toggle-favorite.ts) — тут была та же причина, по которой
      // не работало удаление из избранного.
      const previousQueries = queryClient.getQueriesData<IAdsListResponse>({
        queryKey: ['ads']
      })

      previousQueries.forEach(([queryKey]) => {
        queryClient.setQueryData<IAdsListResponse>(queryKey, old => {
          if (!old) return old

          return { ...old, items: old.items.map(ad => (ad.id === id ? { ...ad, isFavorite: false } : ad)) }
        })
      })

      // См. комментарий в use-add-favorite.ts — страница объявления читает
      // isFavorite из ['ad-public', id], а не из ['ads'].
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

      queryClient.invalidateQueries({ queryKey: ['ads'] })
      queryClient.invalidateQueries({ queryKey: ['favorite-ads'] })
    }
  })

  return { removeFavorite, isRemovingFavorite }
}
