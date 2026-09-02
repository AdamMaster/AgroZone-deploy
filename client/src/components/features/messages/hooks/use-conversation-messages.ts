'use client'

import { useQuery } from '@tanstack/react-query'

import { conversationsService } from '../services/conversations.service'

export function useConversationMessages(conversationId: string | null) {
  const query = useQuery({
    queryKey: ['conversation-messages', conversationId],

    queryFn: () => conversationsService.findMessages(conversationId as string),

    enabled: !!conversationId,

    // Открытый диалог поллим чаще, чем список — это как раз то место, куда
    // сейчас смотрит пользователь.
    refetchInterval: 3000,
    refetchIntervalInBackground: false
  })

  return {
    messages: query.data ?? [],
    isLoading: query.isLoading
  }
}
