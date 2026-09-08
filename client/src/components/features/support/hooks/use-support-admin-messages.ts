'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import { supportService } from '../services/support.service'
import { ISupportMessage } from '../types/support.types'

// Размер страницы — держим тем же, что и лимит по умолчанию на бэкенде
// (см. FindMessagesQueryDto), просто явно, чтобы отсюда же понять, сколько
// сообщений считать "полной страницей" при определении hasMore.
const PAGE_SIZE = 30

export function useSupportAdminMessages(conversationId: string | null) {
  const queryClient = useQueryClient()
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Переключение админом на другой тикет в списке — SupportAdminThread не
  // перемонтируется между такими переключениями (это один и тот же
  // компонент, просто с другим conversation prop). Сброс — прямо во время
  // рендера ("adjusting state when a prop changes",
  // https://react.dev/learn/you-might-not-need-an-effect), а не в
  // useEffect: иначе "история кончилась" от предыдущего треда на один кадр
  // ошибочно применилась бы и к следующему, до того как эффект успеет
  // отработать, плюс лишний цикл рендера на каждое переключение.
  const [trackedConversationId, setTrackedConversationId] = useState(conversationId)
  if (conversationId !== trackedConversationId) {
    setTrackedConversationId(conversationId)
    setHasMore(true)
    setIsLoadingMore(false)
  }

  const query = useQuery({
    queryKey: ['support-admin-messages', conversationId],
    queryFn: () => supportService.getAdminMessages(conversationId as string, { limit: PAGE_SIZE }),
    enabled: !!conversationId
  })

  const messages = useMemo(() => query.data ?? [], [query.data])

  // Та же логика, что и у useSupportMyMessages: первая страница тикета
  // может сразу оказаться неполной (мало сообщений), и тогда "Показать
  // предыдущие" показывать не за чем ещё до первого loadOlder.
  // initialCheckedConversationId хранит conversationId, для которого уже
  // сделали эту проверку — состояние, а не ref (refs нельзя трогать во
  // время рендера, eslint react-hooks/refs), выставляется прямо в теле
  // рендера, как и trackedConversationId выше: при переключении на
  // другой тикет query.data ещё не готов в момент сброса hasMore=true
  // (см. блок trackedConversationId), а как только данные придут —
  // сработает уже здесь, на очередном рендере.
  const [initialCheckedConversationId, setInitialCheckedConversationId] = useState<string | null>(null)

  if (conversationId && query.data && initialCheckedConversationId !== conversationId) {
    setInitialCheckedConversationId(conversationId)

    if (query.data.length < PAGE_SIZE) {
      setHasMore(false)
    }
  }

  const loadOlder = useCallback(async () => {
    if (!conversationId || isLoadingMore || !hasMore || messages.length === 0) return

    setIsLoadingMore(true)

    try {
      const cursor = messages[0].createdAt
      const older = await supportService.getAdminMessages(conversationId, { cursor, limit: PAGE_SIZE })

      // Курсор строго "старше" — сервер отдаёт createdAt: { lt: cursor }
      // (см. SupportService.getMessages), так что неполная страница
      // однозначно значит, что дальше в прошлое сообщений больше нет.
      if (older.length < PAGE_SIZE) {
        setHasMore(false)
      }

      if (older.length > 0) {
        queryClient.setQueryData<ISupportMessage[]>(['support-admin-messages', conversationId], old => [
          ...older,
          ...(old ?? [])
        ])
      }
    } finally {
      setIsLoadingMore(false)
    }
  }, [conversationId, isLoadingMore, hasMore, messages, queryClient])

  return {
    messages,
    isLoading: query.isLoading,
    hasMore,
    isLoadingMore,
    loadOlder
  }
}
