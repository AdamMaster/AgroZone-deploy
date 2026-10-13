'use client'

import { useConversationsSocketStore } from '@/store'
import { useQuery } from '@tanstack/react-query'

import { conversationsService } from '../services/conversations.service'

export function useConversations() {
  const isSocketConnected = useConversationsSocketStore(state => state.isConnected)

  const query = useQuery({
    queryKey: ['conversations'],

    queryFn: () => conversationsService.findAll(),

    // Новые сообщения приходят по сокету (useConversationsSocket) —
    // опрашиваем только пока он не подключён (бэкенд без сокета, обрыв
    // связи): раз в 5 секунд.
    refetchInterval: isSocketConnected ? false : 5000,
    refetchIntervalInBackground: false
  })

  return {
    conversations: query.data ?? [],
    isLoading: query.isLoading
  }
}
