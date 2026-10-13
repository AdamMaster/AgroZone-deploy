'use client'

import { useConversationsSocketStore } from '@/store'
import { useQuery } from '@tanstack/react-query'

import { conversationsService } from '../services/conversations.service'

export function useConversationMessages(conversationId: string | null) {
  const isSocketConnected = useConversationsSocketStore(state => state.isConnected)

  const query = useQuery({
    queryKey: ['conversation-messages', conversationId],

    queryFn: () => conversationsService.findMessages(conversationId as string),

    enabled: !!conversationId,

    // Новые сообщения приходят по сокету (useConversationsSocket) — пока он
    // не подключён, открытый диалог опрашиваем чаще списка: это как раз то
    // место, куда сейчас смотрит пользователь.
    refetchInterval: isSocketConnected ? false : 3000,
    refetchIntervalInBackground: false
  })

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading
  }
}
