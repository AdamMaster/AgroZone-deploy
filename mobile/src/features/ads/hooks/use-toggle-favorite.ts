import { type InfiniteData, type QueryKey, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner-native'

import { useRequestSignIn } from '@/features/auth/hooks/use-request-sign-in'
import { useAuthStore } from '@/features/auth/store/auth-store'

import { adsApi } from '../api/ads.api'
import type { AdDetail } from '../types/ad-detail.types'
import type { AdsListResponse, FavoriteAd } from '../types/ad.types'
import { adDetailQueryKey, similarAdsQueryKeyPrefix } from './use-ad-detail'
import type { AdsListData } from './use-ads-infinite'
import { adsListQueryKeyPrefix } from './use-ads-infinite'
import { favoritesQueryKey } from './use-favorites-infinite'

type FavoritesData = InfiniteData<FavoriteAd[], number>

interface ToggleFavoriteVariables {
  adId: string
  // Состояние ДО нажатия: true — убираем из избранного, false — добавляем.
  isFavorite: boolean
}

const flagItems = (response: AdsListResponse, adId: string, isFavorite: boolean): AdsListResponse => ({
  ...response,
  items: response.items.map(ad => (ad.id === adId ? { ...ad, isFavorite } : ad))
})

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

    // Отметка меняется сразу везде, где видно объявление: в лентах и
    // каталогах, на его странице и в «Похожих». Снимки для отката —
    // одним списком, какой бы формы ни были данные.
    onMutate: async ({ adId, isFavorite }) => {
      const nextFlag = !isFavorite
      const keys = [adsListQueryKeyPrefix, favoritesQueryKey, adDetailQueryKey(adId), similarAdsQueryKeyPrefix]
      await Promise.all(keys.map(queryKey => queryClient.cancelQueries({ queryKey })))

      // Возвращает данные ДО изменения — для отката.
      const update = <T>(queryKey: QueryKey, updater: (data: T) => T) => {
        const previous = queryClient.getQueriesData<T>({ queryKey })
        queryClient.setQueriesData<T>({ queryKey }, data => (data ? updater(data) : data))
        return previous
      }

      const snapshots = [
        ...update<AdsListData>(adsListQueryKeyPrefix, data => ({
          ...data,
          pages: data.pages.map(page => flagItems(page, adId, nextFlag))
        })),
        ...update<AdsListResponse>(similarAdsQueryKeyPrefix, data => flagItems(data, adId, nextFlag)),
        ...update<AdDetail>(adDetailQueryKey(adId), data => ({ ...data, isFavorite: nextFlag }))
      ]

      // Убранное объявление сразу пропадает и из списка «Избранное».
      const previousFavorites = queryClient.getQueryData<FavoritesData>(favoritesQueryKey)
      if (isFavorite && previousFavorites) {
        queryClient.setQueryData<FavoritesData>(favoritesQueryKey, {
          ...previousFavorites,
          pages: previousFavorites.pages.map(page => page.filter(ad => ad.id !== adId))
        })
      }

      return { snapshots, previousFavorites }
    },

    onError: (error, _variables, context) => {
      context?.snapshots.forEach(([queryKey, data]) => queryClient.setQueryData(queryKey, data))
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
