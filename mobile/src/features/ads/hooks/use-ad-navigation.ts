import { useRouter, useSegments } from 'expo-router'
import { useCallback } from 'react'

import type { AdDetailView } from './use-ad-detail'

// Вкладки со своим стеком, внутри которых открывается объявление
// (app/(tabs)/(home,favorites,my-ads)).
const TAB_STACKS = ['(home)', '(favorites)', '(my-ads)'] as const
type TabStack = (typeof TAB_STACKS)[number]

// Открыть объявление в текущей вкладке: из «Избранного» — внутри
// «Избранного», из ленты — внутри «Главной». Так нижняя панель и «Назад»
// ведут себя, как ожидает пользователь.
export function useAdNavigation() {
  const router = useRouter()
  const segments = useSegments()
  const stack: TabStack = TAB_STACKS.find(item => (segments as readonly string[]).includes(item)) ?? '(home)'

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

  return { openAd, openAdStats }
}
