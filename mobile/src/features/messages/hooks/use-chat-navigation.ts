import { useRouter } from 'expo-router'
import { useCallback } from 'react'

import { useTabStack } from '@/features/navigation/hooks/use-tab-stack'

// Переписка открывается в текущей вкладке, как страница сообщений сайта
// с нижней панелью: из объявления — поверх объявления («Назад» вернёт к
// нему), из списка — поверх списка.
export function useChatNavigation() {
  const router = useRouter()
  const stack = useTabStack()

  const openConversation = useCallback(
    (id: string) => router.push({ pathname: `/(tabs)/${stack}/chat/[id]`, params: { id } }),
    [router, stack]
  )

  // «Написать» на странице объявления. Если диалог по нему уже есть, экран
  // нового диалога сам перейдёт в него.
  const openNewConversation = useCallback(
    (adId: string) => router.push({ pathname: `/(tabs)/${stack}/chat/new`, params: { adId } }),
    [router, stack]
  )

  // Диалог по объявлению уже есть (или только что создан первым
  // сообщением) — экран нового диалога заменяется самим диалогом.
  const replaceWithConversation = useCallback(
    (id: string) => router.replace({ pathname: `/(tabs)/${stack}/chat/[id]`, params: { id } }),
    [router, stack]
  )

  const openSupportChat = useCallback(() => router.push(`/(tabs)/${stack}/chat/support`), [router, stack])

  return { openConversation, openNewConversation, replaceWithConversation, openSupportChat }
}
