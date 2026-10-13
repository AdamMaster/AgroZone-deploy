import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { type Socket, io } from 'socket.io-client'

import { API_URL } from '@/config/env'

import { sessionTokenStorage } from '@/lib/auth/session-token-storage'

import { appendMessage } from '../lib/chat-history'
import { useConversationsSocketStore } from '../store/conversations-socket-store'
import type {
  ChatHistory,
  ConversationEvent,
  ConversationListItem,
  ConversationMessageEvent
} from '../types/message.types'
import { conversationMessagesQueryKey, conversationsQueryKey } from './use-conversations'

function createHandlers(queryClient: QueryClient) {
  const refreshList = () => queryClient.invalidateQueries({ queryKey: conversationsQueryKey, exact: true })

  return {
    // Диалог со списком (собеседник, объявление, порядок, «непрочитано») на
    // клиенте не пересобирается — перезапрашиваем; историю уже открытого
    // диалога дополняем сразу.
    onMessage: ({ conversationId, message }: ConversationMessageEvent) => {
      const queryKey = conversationMessagesQueryKey(conversationId)
      // Историю, которую ещё не открывали, не создаём из одного сообщения:
      // при открытии она загрузится целиком.
      if (queryClient.getQueryData<ChatHistory>(queryKey)) {
        queryClient.setQueryData<ChatHistory>(queryKey, current => appendMessage(current, message))
      }

      void refreshList()
    },
    // Прочитано на другом устройстве.
    onRead: ({ conversationId }: ConversationEvent) =>
      queryClient.setQueryData<ConversationListItem[]>(conversationsQueryKey, current =>
        current?.map(item => (item.id === conversationId ? { ...item, isUnread: false } : item))
      ),
    // Удалено на другом устройстве.
    onRemoved: ({ conversationId }: ConversationEvent) =>
      queryClient.setQueryData<ConversationListItem[]>(conversationsQueryKey, current =>
        current?.filter(item => item.id !== conversationId)
      )
  }
}

// Сообщения диалогов по объявлениям приходят сразу — по сокету /conversations
// (ConversationsGateway), как у чата поддержки: ключ сессии в заголовке
// Authorization хэндшейка, только WebSocket, соединение — пока приложение на
// экране. При (пере)подключении то, что пришло без нас, подтягиваем запросом.
// Пока сокет не подключён, диалоги опрашиваются (см. use-conversations.ts).
export function useConversationsRealtime(enabled: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const token = sessionTokenStorage.get()
    if (!enabled || !token) return

    const handlers = createHandlers(queryClient)
    const { setConnected } = useConversationsSocketStore.getState()

    const socket: Socket = io(`${API_URL}/conversations`, {
      transports: ['websocket'],
      extraHeaders: { Authorization: `Bearer ${token}` },
      autoConnect: false
    })

    socket.on('conversations:message', handlers.onMessage)
    socket.on('conversations:read', handlers.onRead)
    socket.on('conversations:removed', handlers.onRemoved)

    socket.on('connect', () => {
      setConnected(true)
      void queryClient.invalidateQueries({ queryKey: conversationsQueryKey })
    })
    // Сервер отказал (conversations:error) или связь оборвалась — снова опрос.
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', () => setConnected(false))

    if (AppState.currentState === 'active') socket.connect()

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        socket.connect()
      } else {
        socket.disconnect()
      }
    })

    return () => {
      subscription.remove()
      socket.removeAllListeners()
      socket.disconnect()
      setConnected(false)
    }
  }, [enabled, queryClient])
}
