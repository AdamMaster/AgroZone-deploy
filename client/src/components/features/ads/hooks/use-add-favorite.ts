'use client'

import { InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query'
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
      await queryClient.cancelQueries({ queryKey: ['ads-infinite'] })
      await queryClient.cancelQueries({ queryKey: ['ad-public', id] })

      // Карточки на главной/в каталоге читают isFavorite из useAdsInfinite,
      // а её кэш живёт под ['ads-infinite', params] и хранит
      // InfiniteData<IAdsListResponse> ({pages, pageParams}), а не один
      // плоский IAdsListResponse — раньше здесь патчился несуществующий
      // ключ ['ads'] (остаток от неинфинитной useAds), из-за чего
      // оптимистичный апдейт вообще ничего не находил и сердечко на
      // карточке не закрашивалось до перезагрузки страницы.
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
              items: page.items.map(ad => (ad.id === id ? { ...ad, isFavorite: true } : ad))
            }))
          }
        })
      })

      // Страница самого объявления (/ads/[id]) читает isFavorite из
      // отдельного кэша ['ad-public', id] (см. use-ad.ts), а не из
      // ['ads-infinite'] — без своего оптимистичного апдейта здесь
      // сердечко на этой странице "залипало" закрашенным при ошибке
      // (например, у неавторизованного пользователя): откатывать было
      // нечего, потому что менялся только список.
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

      queryClient.invalidateQueries({ queryKey: ['ads-infinite'] })
      queryClient.invalidateQueries({ queryKey: ['favorite-ads'] })
    }
  })

  return { addFavorite, isAddingFavorite }
}
