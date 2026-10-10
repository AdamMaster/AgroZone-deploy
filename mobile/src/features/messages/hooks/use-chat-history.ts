import { type QueryKey, useQuery, useQueryClient } from '@tanstack/react-query'
import { useIsFocused } from 'expo-router'
import { useCallback, useState } from 'react'
import { toast } from 'sonner-native'

import type { MessagesPageParams } from '../api/conversations.api'
import { CHAT_PAGE_SIZE, mergeLatestPage, prependOlderPage } from '../lib/chat-history'
import type { ChatHistory, ChatMessage } from '../types/message.types'

interface UseChatHistoryOptions {
  // Должен быть стабильным (useMemo у вызывающего хука).
  queryKey: QueryKey
  fetchPage: (params: MessagesPageParams, signal?: AbortSignal) => Promise<ChatMessage[]>
  // Как часто перепроверять новые сообщения, пока чат на экране. false —
  // новые приходят другим путём (сокет поддержки).
  pollIntervalMs: number | false
}

// История переписки: последние сообщения (с опросом, пока чат открыт) и
// подгрузка старых при прокрутке вверх. Общая для диалогов по объявлениям
// и чата поддержки.
export function useChatHistory({ queryKey, fetchPage, pollIntervalMs }: UseChatHistoryOptions) {
  const queryClient = useQueryClient()
  const isFocused = useIsFocused()
  const [isLoadingOlder, setIsLoadingOlder] = useState(false)

  const query = useQuery({
    queryKey,
    // Кэш читаем уже после ответа: пока шёл запрос, могли подгрузиться
    // старые сообщения, и их нельзя потерять.
    queryFn: async ({ signal }) => {
      const latest = await fetchPage({ limit: CHAT_PAGE_SIZE }, signal)
      return mergeLatestPage(queryClient.getQueryData<ChatHistory>(queryKey), latest)
    },
    // Опрос — только пока чат перед глазами (вкладка с ним могла остаться
    // открытой в фоне); в фоновом приложении react-query его и так не делает.
    refetchInterval: isFocused ? pollIntervalMs : false
  })

  const hasOlder = query.data?.hasOlder ?? false

  const loadOlder = useCallback(async () => {
    const oldest = queryClient.getQueryData<ChatHistory>(queryKey)?.messages[0]
    if (isLoadingOlder || !hasOlder || !oldest) return

    setIsLoadingOlder(true)
    try {
      const older = await fetchPage({ cursor: oldest.createdAt, limit: CHAT_PAGE_SIZE })
      queryClient.setQueryData<ChatHistory>(queryKey, current => prependOlderPage(current, older))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить сообщения')
    } finally {
      setIsLoadingOlder(false)
    }
  }, [fetchPage, hasOlder, isLoadingOlder, queryClient, queryKey])

  return {
    messages: query.data?.messages,
    error: query.error,
    refetch: query.refetch,
    hasOlder,
    isLoadingOlder,
    loadOlder
  }
}
