'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'

import {
  ISupportAdminConversationListItem,
  ISupportMessage,
  ISupportSocketConversationClearedEvent,
  ISupportSocketConversationHiddenEvent,
  ISupportSocketMessageDeletedEvent,
  ISupportSocketMessageEvent
} from '../types/support.types'
import { appendSupportMessage } from '../utils/append-support-message'
import { removeSupportMessage } from '../utils/remove-support-message'
import { useSupportSocket } from './use-support-socket'

interface UseSupportRealtimeOptions {
  isAdmin: boolean
  enabled: boolean
  isPanelOpen: boolean
  activeAdminConversationId: string | null
}

// Единая точка входа для realtime — держим ровно один сокет на вкладку
// (см. SupportChatWidget: этот хук вызывается там, а не в каждом
// под-компоненте панели, иначе панель открылась-закрылась = новое
// соединение). Компонент виджета живёт в корневом layout всегда, поэтому
// hasUnread переживает закрытие панели — это и даёт бейдж на закрытой
// кнопке.
export function useSupportRealtime({ isAdmin, enabled, isPanelOpen, activeAdminConversationId }: UseSupportRealtimeOptions) {
  const queryClient = useQueryClient()
  const [hasUnread, setHasUnread] = useState(false)

  const handleMessage = useCallback(
    (event: ISupportSocketMessageEvent) => {
      if (isAdmin) {
        // Админ получает вообще все сообщения по всем тикетам (гейтвей
        // шлёт их в общую комнату 'support:admin', см. support.gateway.ts)
        // — список обновляем всегда, а кэш конкретного треда трогаем,
        // только если этот тред сейчас открыт.
        queryClient.invalidateQueries({ queryKey: ['support-admin-conversations'] })

        if (event.conversationId === activeAdminConversationId) {
          queryClient.setQueryData<ISupportMessage[]>(['support-admin-messages', event.conversationId], old =>
            appendSupportMessage(old, event.message)
          )
        }

        if (!event.isFromAdmin && (!isPanelOpen || event.conversationId !== activeAdminConversationId)) {
          setHasUnread(true)
        }

        return
      }

      // Участник подписан на одну-единственную персональную комнату (см.
      // SupportGateway.participantRoom) — любое событие тут гарантированно
      // про его же тикет, отдельно сверять conversationId не нужно.
      queryClient.setQueryData<ISupportMessage[]>(['support-my-messages'], old => appendSupportMessage(old, event.message))
      queryClient.invalidateQueries({ queryKey: ['support-my-conversation'] })

      if (event.isFromAdmin && !isPanelOpen) {
        setHasUnread(true)
      }
    },
    [isAdmin, isPanelOpen, activeAdminConversationId, queryClient]
  )

  // Модераторское удаление (см. SupportGateway.handleMessageDeleted) —
  // долетает и до админа (все тикеты сидят в ADMIN_ROOM), и до собеседника,
  // чьё сообщение (или сообщение самого админа) только что скрыли.
  const handleMessageDeleted = useCallback(
    (event: ISupportSocketMessageDeletedEvent) => {
      if (isAdmin) {
        queryClient.setQueryData<ISupportMessage[]>(['support-admin-messages', event.conversationId], old =>
          removeSupportMessage(old, event.messageId)
        )
        // lastMessage в списке тикетов мог указывать как раз на удалённое
        // сообщение — перезапрашиваем список, чтобы превью подтянуло
        // следующее, не удалённое (см. getAdminConversations на бэкенде).
        queryClient.invalidateQueries({ queryKey: ['support-admin-conversations'] })
        return
      }

      queryClient.setQueryData<ISupportMessage[]>(['support-my-messages'], old => removeSupportMessage(old, event.messageId))
    },
    [isAdmin, queryClient]
  )

  // "Удалить всё" (см. SupportGateway.handleConversationCleared) — та же
  // аудитория, но список схлопывается целиком, а не по одному id.
  const handleConversationCleared = useCallback(
    (event: ISupportSocketConversationClearedEvent) => {
      if (isAdmin) {
        queryClient.setQueryData<ISupportMessage[]>(['support-admin-messages', event.conversationId], [])
        queryClient.invalidateQueries({ queryKey: ['support-admin-conversations'] })
        return
      }

      queryClient.setQueryData<ISupportMessage[]>(['support-my-messages'], [])
    },
    [isAdmin, queryClient]
  )

  // "Удалить чат" (см. SupportGateway.handleConversationHidden) — приходит
  // только админам (у собеседника этого события в принципе не бывает, см.
  // isAdmin-гейт ниже вместо ветвления, как у остальных обработчиков).
  // Убираем тикет из списка тем же способом, что и hideConversation в
  // useHideSupportAdminConversation — на случай, если "Удалить чат" нажали
  // в другой вкладке того же админа.
  const handleConversationHidden = useCallback(
    (event: ISupportSocketConversationHiddenEvent) => {
      if (!isAdmin) return

      queryClient.setQueryData<ISupportAdminConversationListItem[]>(['support-admin-conversations'], old =>
        old?.filter(item => item.id !== event.conversationId)
      )
    },
    [isAdmin, queryClient]
  )

  useSupportSocket(enabled, {
    onMessage: handleMessage,
    onMessageDeleted: handleMessageDeleted,
    onConversationCleared: handleConversationCleared,
    onConversationHidden: handleConversationHidden
  })

  const clearUnread = useCallback(() => setHasUnread(false), [])

  return { hasUnread, clearUnread }
}
