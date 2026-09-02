'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
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
      await queryClient.cancelQueries({ queryKey: ['ads'] })
      await queryClient.cancelQueries({ queryKey: ['ad-public', id] })

      // Кэш под ключом ['ads', params] — это IAdsListResponse
      // ({items, total, page, limit}), а не голый массив (с тех пор, как
      // useAds стал отдавать total для пагинации фильтра) — раньше здесь
      // ошибочно предполагался IAd[], из-за чего old.map падал с
      // TypeError ещё до реального запроса на сервер, и избранное
      // переставало добавляться/удаляться вообще молча (весь mutate
      // обрывался в onMutate).
      const previousQueries = queryClient.getQueriesData<IAdsListResponse>({ queryKey: ['ads'] })

      previousQueries.forEach(([queryKey]) => {
        queryClient.setQueryData<IAdsListResponse>(queryKey, old => {
          if (!old) return old
          return { ...old, items: old.items.map(ad => (ad.id === id ? { ...ad, isFavorite: !ad.isFavorite } : ad)) }
        })
      })

      // См. комментарий в use-add-favorite.ts — страница объявления читает
      // isFavorite из ['ad-public', id], а не из ['ads'].
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

      // Инвалидируем все запросы, начинающиеся с 'ads' и 'favorite-ads'
      queryClient.invalidateQueries({ queryKey: ['ads'] })
      queryClient.invalidateQueries({ queryKey: ['favorite-ads'] })
    }
  })

  return { toggleFavorite, isLoadingToggle }
}
