'use client'

import { useQuery } from '@tanstack/react-query'

import { conversationsService } from '../services/conversations.service'

export function useConversations() {
  const query = useQuery({
    queryKey: ['conversations'],

    queryFn: () => conversationsService.findAll(),

    // Поллинг вместо WebSocket — сознательный выбор для первой версии чата
    // (см. обсуждение по фичам): список диалогов не обязан обновляться
    // мгновенно, 5 секунд — разумный компромисс между "почти живо" и
    // нагрузкой на бэкенд. Когда дойдём до WebSocket-шлюза, поменяется
    // только этот хук — компоненты, которые его используют, трогать не
    // придётся.
    refetchInterval: 5000,
    refetchIntervalInBackground: false
  })

  return {
    conversations: query.data ?? [],
    isLoading: query.isLoading
  }
}
