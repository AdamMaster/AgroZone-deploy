'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services/ads.service'
import { IAd, IAdsListResponse } from '../types/ad.types'

export function useAddFavorite() {
  const queryClient = useQueryClient()

  const { mutate: addFavorite, isPending: isAddingFavorite } = useMutation({
    mutationKey: ['add favorite'],

    mutationFn: (id: string) => adsService.addFavorite(id),

    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['ads'] })
      await queryClient.cancelQueries({ queryKey: ['ad-public', id] })

      // Кэш под ['ads', params] — это IAdsListResponse, не голый массив
      // (см. use-toggle-favorite.ts) — тут была та же причина, по которой
      // не работало добавление в избранное.
      const previousQueries = queryClient.getQueriesData<IAdsListResponse>({
        queryKey: ['ads']
      })

      previousQueries.forEach(([queryKey]) => {
        queryClient.setQueryData<IAdsListResponse>(queryKey, old => {
          if (!old) return old

          return { ...old, items: old.items.map(ad => (ad.id === id ? { ...ad, isFavorite: true } : ad)) }
        })
      })

      // Страница самого объявления (/ads/[id]) читает isFavorite из
      // отдельного кэша ['ad-public', id] (см. use-ad.ts), а не из ['ads'] —
      // без своего оптимистичного апдейта здесь сердечко на этой странице
      // "залипало" закрашенным при ошибке (например, у неавторизованного
      // пользователя): откатывать было нечего, потому что менялся только
      // список.
      const previousAd = queryClient.getQueryData<IAd>(['ad-public', id])
      if (previousAd) {
        queryClient.setQueryData<IAd>(['ad-public', id], { ...previousAd, isFavorite: true })
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

      // Раньше тут был захардкоженный общий текст, который скрывал
      // настоящую причину — например, для неавторизованного пользователя
      // сервер уже возвращает точный текст ("Чтобы добавлять в
      // избранное, необходимо авторизоваться."), но он терялся.
      toastMessageHandler(err)
    },

    // ✅ success
    onSuccess: () => {
      toast.success('Добавлено в избранное')

      queryClient.invalidateQueries({ queryKey: ['ads'] })
      queryClient.invalidateQueries({ queryKey: ['favorite-ads'] })
    }
  })

  return { addFavorite, isAddingFavorite }
}
