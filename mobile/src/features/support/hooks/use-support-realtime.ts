import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { AppState } from 'react-native'
import { type Socket, io } from 'socket.io-client'

import { API_URL } from '@/config/env'

import { appendMessage, removeMessage } from '@/features/messages/lib/chat-history'
import type { ChatHistory } from '@/features/messages/types/message.types'

import { sessionTokenStorage } from '@/lib/auth/session-token-storage'

import { useSupportChatStore } from '../store/support-chat-store'
import type {
  SupportConversationClearedEvent,
  SupportMessageDeletedEvent,
  SupportMessageEvent
} from '../types/support.types'
import { supportMessagesQueryKey } from './use-support-chat'

// Ответы поддержки приходят сразу — по сокету /support (SupportGateway), как
// на сайте. Ключ сессии — в заголовке Authorization хэндшейка (cookie у
// приложения нет). Соединение держится, только пока приложение на экране:
// в фоне оно всё равно было бы оборвано системой; при возвращении история
// перезапрашивается, чтобы подтянуть пропущенное.
export function useSupportRealtime(enabled: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const token = sessionTokenStorage.get()
    if (!enabled || !token) return

    const socket: Socket = io(`${API_URL}/support`, {
      // В React Native — только WebSocket: заголовки хэндшейка он передаёт
      // надёжно, а долгий опрос через XHR здесь не нужен.
      transports: ['websocket'],
      extraHeaders: { Authorization: `Bearer ${token}` },
      autoConnect: false
    })

    const updateHistory = (updater: (current: ChatHistory | undefined) => ChatHistory | undefined) =>
      queryClient.setQueryData<ChatHistory>(supportMessagesQueryKey, updater)

    socket.on('support:message', ({ message, isFromAdmin }: SupportMessageEvent) => {
      updateHistory(current => (current ? appendMessage(current, message) : current))

      const { isChatOpen, setHasUnread } = useSupportChatStore.getState()
      if (isFromAdmin && !isChatOpen) setHasUnread(true)
    })

    socket.on('support:message-deleted', ({ messageId }: SupportMessageDeletedEvent) =>
      updateHistory(current => removeMessage(current, messageId))
    )

    socket.on('support:conversation-cleared', (_event: SupportConversationClearedEvent) =>
      updateHistory(current => (current ? { messages: [], hasOlder: false } : current))
    )

    // Переподключение (вернулись в приложение, сменилась сеть) — то, что
    // пришло без нас, подтягиваем запросом.
    let hasConnected = false
    socket.on('connect', () => {
      if (hasConnected) void queryClient.invalidateQueries({ queryKey: supportMessagesQueryKey })
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
      // Вышли из аккаунта — отметка о новом ответе принадлежала ему.
      useSupportChatStore.getState().setHasUnread(false)
    }
  }, [enabled, queryClient])
}
