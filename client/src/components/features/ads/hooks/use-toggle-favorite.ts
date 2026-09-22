'use client'

import { InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services/ads.service'
import { IAd, IAdsListResponse } from '../types/ad.types'

interface ToggleFavoriteVariables {
  id: string
  isFavorite: boolean
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()

  const { mutate: toggleFavorite, isPending: isLoadingToggle } = useMutation({
    mutationKey: ['toggle favorite'],

    // AdsService не даёт единого toggle-эндпоинта — только раздельные
    // addFavorite/removeFavorite, поэтому вызывающая сторона обязана
    // передать текущее isFavorite вместе с id, чтобы хук знал, какой из
    // двух методов дёрнуть.
    mutationFn: ({ id, isFavorite }: ToggleFavoriteVariables) =>
      isFavorite ? adsService.removeFavorite(id) : adsService.addFavorite(id),

    onMutate: async ({ id }: ToggleFavoriteVariables) => {
      await queryClient.cancelQueries({ queryKey: ['ads-infinite'] })
      await queryClient.cancelQueries({ queryKey: ['ad-public', id] })

      // Карточки читают isFavorite из useAdsInfinite — её кэш лежит под
      // ['ads-infinite', params] и хранит InfiniteData<IAdsListResponse>
      // ({pages, pageParams}), а не голый IAdsListResponse под ['ads']
      // (несуществующий ключ от старой неинфинитной useAds) — из-за
      // несовпадения ключа этот оптимистичный апдейт раньше вообще ничего
      // не находил.
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
              items: page.items.map(ad => (ad.id === id ? { ...ad, isFavorite: !ad.isFavorite } : ad))
            }))
          }
        })
      })

      // См. комментарий в use-add-favorite.ts — страница объявления читает
      // isFavorite из ['ad-public', id], а не из ['ads-infinite'].
      const previousAd = queryClient.getQueryData<IAd>(['ad-public', id])
      if (previousAd) {
        queryClient.setQueryData<IAd>(['ad-public', id], { ...previousAd, isFavorite: !previousAd.isFavorite })
      }

      return { previousQueries, previousAd }
    },

    onError: (err, { id }, context) => {
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

    onSuccess(_data, { isFavorite }) {
      // isFavorite здесь — состояние ДО переключения, поэтому итоговое
      // состояние (и текст тоста) — обратное.
      toast.success(!isFavorite ? 'Добавлено в избранное' : 'Удалено из избранного')

      // Инвалидируем все запросы, начинающиеся с 'ads-infinite' и 'favorite-ads'
      queryClient.invalidateQueries({ queryKey: ['ads-infinite'] })
      queryClient.invalidateQueries({ queryKey: ['favorite-ads'] })
    }
  })

  return { toggleFavorite, isLoadingToggle }
}
