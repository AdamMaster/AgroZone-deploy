import { useRouter } from 'expo-router'
import { useCallback } from 'react'

import { useTabStack } from '@/features/navigation/hooks/use-tab-stack'

import type { AdDetailView } from './use-ad-detail'

// Открыть объявление в текущей вкладке: из «Избранного» — внутри
// «Избранного», из ленты — внутри «Главной».
export function useAdNavigation() {
  const router = useRouter()
  const stack = useTabStack()

  const openAd = useCallback(
    (id: string, view: AdDetailView = 'public') =>
      router.push({
        pathname: `/(tabs)/${stack}/ads/[id]`,
        params: view === 'owner' ? { id, view } : { id }
      }),
    [router, stack]
  )

  const openAdStats = useCallback(
    (id: string) => router.push({ pathname: `/(tabs)/${stack}/ads/[id]/stats`, params: { id } }),
    [router, stack]
  )

  // Страница продавца — в текущей вкладке, как /sellers/:id сайта.
  // tab: 'reviews' — сразу вкладка «Отзывы» (из уведомления, из своего
  // рейтинга).
  const openSeller = useCallback(
    (id: string, tab?: 'reviews') =>
      router.push({ pathname: `/(tabs)/${stack}/sellers/[id]`, params: tab ? { id, tab } : { id } }),
    [router, stack]
  )

  // Правка — отдельный экран поверх вкладок (как страница /ads/:id/edit
  // сайта, без нижней панели).
  const openAdEditor = useCallback((id: string) => router.push({ pathname: '/edit-ad/[id]', params: { id } }), [router])

  return { openAd, openAdStats, openSeller, openAdEditor }
}
