import { type InfiniteData, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner-native'

import { useRequestSignIn } from '@/features/auth/hooks/use-request-sign-in'
import { useAuthStore } from '@/features/auth/store/auth-store'

import { adsApi } from '../api/ads.api'
import type { FavoriteAd } from '../types/ad.types'
import type { AdsListData } from './use-ads-infinite'
import { adsListQueryKeyPrefix } from './use-ads-infinite'
import { favoritesQueryKey } from './use-favorites-infinite'

type FavoritesData = InfiniteData<FavoriteAd[], number>

interface ToggleFavoriteVariables {
  adId: string
  // Состояние ДО нажатия: true — убираем из избранного, false — добавляем.
  isFavorite: boolean
}

function setFavoriteFlag(data: AdsListData | undefined, adId: string, isFavorite: boolean) {
  if (!data) return data

  return {
    ...data,
    pages: data.pages.map(page => ({
      ...page,
      items: page.items.map(ad => (ad.id === adId ? { ...ad, isFavorite } : ad))
    }))
  }
}

// Сердечко «в избранное» — как useAddFavorite/useRemoveFavorite сайта:
// отметка меняется сразу во всех лентах (оптимистично), при ошибке
// откатывается, после успеха — тост и обновление списка избранного.
// Гостя сердечко отправляет на вход: избранное есть только у аккаунта.
export function useToggleFavorite() {
  const requestSignIn = useRequestSignIn()
  const queryClient = useQueryClient()
  const isSignedIn = useAuthStore(state => state.status === 'signedIn')

  const mutation = useMutation({
    mutationFn: ({ adId, isFavorite }: ToggleFavoriteVariables) =>
      isFavorite ? adsApi.removeFavorite(adId) : adsApi.addFavorite(adId),

    onMutate: async ({ adId, isFavorite }) => {
      await queryClient.cancelQueries({ queryKey: adsListQueryKeyPrefix })

      await queryClient.cancelQueries({ queryKey: favoritesQueryKey })

      const previous = queryClient.getQueriesData<AdsListData>({ queryKey: adsListQueryKeyPrefix })
      previous.forEach(([queryKey]) =>
        queryClient.setQueryData<AdsListData>(queryKey, data => setFavoriteFlag(data, adId, !isFavorite))
      )

      // Убранное объявление сразу пропадает и из списка «Избранное».
      const previousFavorites = queryClient.getQueryData<FavoritesData>(favoritesQueryKey)
      if (isFavorite && previousFavorites) {
        queryClient.setQueryData<FavoritesData>(favoritesQueryKey, {
          ...previousFavorites,
          pages: previousFavorites.pages.map(page => page.filter(ad => ad.id !== adId))
        })
      }

      return { previous, previousFavorites }
    },

    onError: (error, _variables, context) => {
      context?.previous.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data))
      if (context?.previousFavorites) queryClient.setQueryData(favoritesQueryKey, context.previousFavorites)
      toast.error(error.message)
    },

    onSuccess: (_data, { isFavorite }) => {
      toast.success(isFavorite ? 'Удалено из избранного' : 'Добавлено в избранное')
      void queryClient.invalidateQueries({ queryKey: favoritesQueryKey })
    }
  })

  const toggleFavorite = (variables: ToggleFavoriteVariables) => {
    if (!isSignedIn) {
      requestSignIn()
      return
    }

    mutation.mutate(variables)
  }

  return { toggleFavorite, isPending: mutation.isPending, pendingAdId: mutation.variables?.adId }
}
