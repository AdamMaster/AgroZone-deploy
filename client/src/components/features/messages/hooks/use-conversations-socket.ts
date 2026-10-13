'use client'

import { useConversationsSocketStore } from '@/store'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Socket, io } from 'socket.io-client'

import {
  IConversationListItem,
  IConversationSocketEvent,
  IConversationSocketMessageEvent,
  IMessage
} from '../types/message.types'
import { appendMessage } from '../utils/append-message'

// Живые обновления диалогов по объявлениям — по сокету /conversations
// (ConversationsGateway на бэкенде), вместо поллинга списка и открытого
// диалога. Отдельное соединение от REST-клиента, withCredentials — чтобы
// браузер отправил cookie сессии на хэндшейк (фронт и API на разных
// origin, см. use-support-socket.ts).
//
// Пока сокет не подключён (бэкенд без него, обрыв связи), хуки списка и
// сообщений опрашивают, как раньше (см. use-conversations.ts).
export function useConversationsSocket(enabled: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return

    const { setConnected } = useConversationsSocketStore.getState()
    const socket: Socket = io(`${process.env.SERVER_URL}/conversations`, { withCredentials: true })

    // Список (собеседник, объявление, порядок, «непрочитано») на клиенте не
    // пересобирается — перезапрашиваем; историю уже открытого диалога
    // дополняем сразу.
    socket.on('conversations:message', ({ conversationId, message }: IConversationSocketMessageEvent) => {
      // Историю, которую ещё не открывали, не создаём из одного сообщения —
      // при открытии она загрузится целиком.
      queryClient.setQueryData<IMessage[]>(['conversation-messages', conversationId], old =>
        old ? appendMessage(old, message) : old
      )
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    })

    // Прочитано на другом устройстве или в другой вкладке.
    socket.on('conversations:read', ({ conversationId }: IConversationSocketEvent) => {
      queryClient.setQueryData<IConversationListItem[]>(['conversations'], old =>
        old?.map(item => (item.id === conversationId ? { ...item, isUnread: false } : item))
      )
    })

    // Удалено на другом устройстве или в другой вкладке.
    socket.on('conversations:removed', ({ conversationId }: IConversationSocketEvent) => {
      queryClient.setQueryData<IConversationListItem[]>(['conversations'], old =>
        old?.filter(item => item.id !== conversationId)
      )
    })

    // (Пере)подключились — то, что пришло без нас, подтягиваем запросом.
    socket.on('connect', () => {
      setConnected(true)
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['conversation-messages'] })
    })
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', () => setConnected(false))

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      setConnected(false)
    }
  }, [enabled, queryClient])
}
