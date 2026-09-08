'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import { supportService } from '../services/support.service'
import { ISupportMessage } from '../types/support.types'

const PAGE_SIZE = 30

// Без диалога сервер отдаёт пустой массив (см. SupportService.getMyMessages
// на бэкенде — там нет 404 на "тикета ещё нет"), поэтому дожидаться
// useSupportMyConversation не нужно — оба запроса идут параллельно.
//
// Сброс hasMore при смене тикета тут не нужен, в отличие от
// useSupportAdminMessages — у участника ровно один тикет за всю жизнь
// компонента (см. partial unique index conversation_support_buyer_unique/
// guest_unique на бэкенде), queryKey не параметризован conversationId.
export function useSupportMyMessages(enabled: boolean) {
  const queryClient = useQueryClient()
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  // Первая страница уже может быть неполной (например, у тикета всего
  // одно сообщение) — тогда "показывать дальше" нечего с самого начала,
  // ещё до первого клика на "Показать предыдущие". Без этой проверки
  // hasMore так и оставался бы true (он выставляется в false только
  // внутри loadOlder), и кнопка светилась бы даже когда истории больше
  // нет. Именно useState, а не useRef — refs нельзя трогать во время
  // рендера (eslint react-hooks/refs), а adjusting state during render
  // (https://react.dev/learn/you-might-not-need-an-effect) требует
  // именно состояния для сравнения.
  const [initialCheckDone, setInitialCheckDone] = useState(false)

  const query = useQuery({
    queryKey: ['support-my-messages'],
    queryFn: () => supportService.getMyMessages({ limit: PAGE_SIZE }),
    enabled
  })

  const messages = useMemo(() => query.data ?? [], [query.data])

  if (!initialCheckDone && query.data) {
    setInitialCheckDone(true)

    if (query.data.length < PAGE_SIZE) {
      setHasMore(false)
    }
  }

  const loadOlder = useCallback(async () => {
    if (isLoadingMore || !hasMore || messages.length === 0) return

    setIsLoadingMore(true)

    try {
      const cursor = messages[0].createdAt
      const older = await supportService.getMyMessages({ cursor, limit: PAGE_SIZE })

      if (older.length < PAGE_SIZE) {
        setHasMore(false)
      }

      if (older.length > 0) {
        queryClient.setQueryData<ISupportMessage[]>(['support-my-messages'], old => [...older, ...(old ?? [])])
      }
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, messages, queryClient])

  return {
    messages,
    isLoading: query.isLoading,
    hasMore,
    isLoadingMore,
    loadOlder
  }
}
