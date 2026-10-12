import { type QueryClient, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { type Socket, io } from 'socket.io-client'

import { API_URL } from '@/config/env'

import { appendMessage, removeMessage } from '@/features/messages/lib/chat-history'
import type { ChatHistory } from '@/features/messages/types/message.types'

import { sessionTokenStorage } from '@/lib/auth/session-token-storage'

import { ADMIN_LIST_VIEW, useSupportChatStore } from '../store/support-chat-store'
import type {
  SupportAdminConversation,
  SupportConversationClearedEvent,
  SupportConversationHiddenEvent,
  SupportMessageDeletedEvent,
  SupportMessageEvent
} from '../types/support.types'
import { supportAdminConversationsQueryKey, supportAdminMessagesQueryKey } from './use-support-admin'
import { supportMessagesQueryKey } from './use-support-chat'

interface SupportSocketHandlers {
  onMessage: (event: SupportMessageEvent) => void
  onMessageDeleted: (event: SupportMessageDeletedEvent) => void
  onConversationCleared: (event: SupportConversationClearedEvent) => void
  onConversationHidden?: (event: SupportConversationHiddenEvent) => void
}

// Сообщения собственного тикета пользователя: комната сокета личная, любое
// событие в ней — про его же обращение.
function createParticipantHandlers(queryClient: QueryClient): SupportSocketHandlers {
  const updateHistory = (updater: (current: ChatHistory | undefined) => ChatHistory | undefined) =>
    queryClient.setQueryData<ChatHistory>(supportMessagesQueryKey, updater)

  return {
    onMessage: ({ message, isFromAdmin }) => {
      updateHistory(current => (current ? appendMessage(current, message) : current))

      const { isChatOpen, setHasUnread } = useSupportChatStore.getState()
      if (isFromAdmin && !isChatOpen) setHasUnread(true)
    },
    onMessageDeleted: ({ messageId }) => updateHistory(current => removeMessage(current, messageId)),
    onConversationCleared: () => updateHistory(current => (current ? { messages: [], hasOlder: false } : current))
  }
}

// Администратор получает все сообщения по всем обращениям (общая комната
// сервера): список обновляем всегда, историю — только у тех обращений, что
// уже загружались.
function createAdminHandlers(queryClient: QueryClient): SupportSocketHandlers {
  const updateHistory = (
    conversationId: string,
    updater: (current: ChatHistory | undefined) => ChatHistory | undefined
  ) => {
    const queryKey = supportAdminMessagesQueryKey(conversationId)
    // Историю, которую ещё не открывали, не создаём из одного сообщения:
    // при открытии она загрузится целиком.
    if (queryClient.getQueryData<ChatHistory>(queryKey)) queryClient.setQueryData<ChatHistory>(queryKey, updater)
  }

  const refreshList = () => queryClient.invalidateQueries({ queryKey: supportAdminConversationsQueryKey })

  return {
    onMessage: ({ conversationId, message, isFromAdmin }) => {
      updateHistory(conversationId, current => appendMessage(current, message))
      void refreshList()

      // Новое обращение или ответ пользователя — точка, если администратор
      // не смотрит ни на список, ни на это обращение.
      const { adminView, setHasUnread } = useSupportChatStore.getState()
      if (!isFromAdmin && adminView !== ADMIN_LIST_VIEW && adminView !== conversationId) setHasUnread(true)
    },
    onMessageDeleted: ({ conversationId, messageId }) => {
      updateHistory(conversationId, current => removeMessage(current, messageId))
      void refreshList()
    },
    onConversationCleared: ({ conversationId }) => {
      updateHistory(conversationId, () => ({ messages: [], hasOlder: false }))
      void refreshList()
    },
    onConversationHidden: ({ conversationId }) =>
      queryClient.setQueryData<SupportAdminConversation[]>(supportAdminConversationsQueryKey, current =>
        current?.filter(item => item.id !== conversationId)
      )
  }
}

// Ответы поддержки приходят сразу — по сокету /support (SupportGateway), как
// на сайте. Ключ сессии — в заголовке Authorization хэндшейка (cookie у
// приложения нет). Соединение держится, только пока приложение на экране:
// в фоне оно всё равно было бы оборвано системой; при возвращении история
// перезапрашивается, чтобы подтянуть пропущенное.
export function useSupportRealtime(enabled: boolean, isAdmin: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const token = sessionTokenStorage.get()
    if (!enabled || !token) return

    const handlers = isAdmin ? createAdminHandlers(queryClient) : createParticipantHandlers(queryClient)

    const socket: Socket = io(`${API_URL}/support`, {
      // В React Native — только WebSocket: заголовки хэндшейка он передаёт
      // надёжно, а долгий опрос через XHR здесь не нужен.
      transports: ['websocket'],
      extraHeaders: { Authorization: `Bearer ${token}` },
      autoConnect: false
    })

    socket.on('support:message', handlers.onMessage)
    socket.on('support:message-deleted', handlers.onMessageDeleted)
    socket.on('support:conversation-cleared', handlers.onConversationCleared)
    if (handlers.onConversationHidden) socket.on('support:conversation-hidden', handlers.onConversationHidden)

    // Переподключение (вернулись в приложение, сменилась сеть) — то, что
    // пришло без нас, подтягиваем запросом.
    let hasConnected = false
    socket.on('connect', () => {
      if (hasConnected) void queryClient.invalidateQueries({ queryKey: ['support'] })
      hasConnected = true
    })

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
      // Вышли из аккаунта — отметка о новом сообщении принадлежала ему.
      useSupportChatStore.getState().setHasUnread(false)
    }
  }, [enabled, isAdmin, queryClient])
}
