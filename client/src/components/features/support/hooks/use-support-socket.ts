'use client'

import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

import {
  ISupportSocketConversationClearedEvent,
  ISupportSocketConversationHiddenEvent,
  ISupportSocketMessageDeletedEvent,
  ISupportSocketMessageEvent
} from '../types/support.types'

interface UseSupportSocketHandlers {
  onMessage: (event: ISupportSocketMessageEvent) => void
  onMessageDeleted: (event: ISupportSocketMessageDeletedEvent) => void
  onConversationCleared: (event: ISupportSocketConversationClearedEvent) => void
  onConversationHidden: (event: ISupportSocketConversationHiddenEvent) => void
}

// Отдельное соединение от обычного REST-клиента (см. shared/api) — тому
// достаточно credentials: 'include' на каждый fetch, а тут нужен именно
// socket.io-клиент на namespace /support (см. SupportGateway на бэкенде).
// withCredentials обязателен — иначе браузер не отправит cookie сессии на
// хэндшейк (фронт на agro-zone.ru, API на api.agro-zone.ru — разные
// origin, хоть и один SESSION_DOMAIN, см. nginx/conf.d/app.conf).
//
// handlers хранится в ref, а не в зависимостях useEffect — иначе каждый
// новый объект handlers (а он new-объект при каждом рендере компонента,
// вызывающего этот хук) пересоздавал бы сокет-соединение.
export function useSupportSocket(enabled: boolean, handlers: UseSupportSocketHandlers) {
  const handlersRef = useRef(handlers)

  // Обновление ref вынесено в отдельный эффект без зависимостей (а не
  // прямое присваивание в теле хука) — присваивание during render запрещено
  // новым react-hooks/refs правилом (реф не предназначен для чтения/записи
  // во время рендера). Эффект без deps выполняется после каждого рендера,
  // так что к моменту любого асинхронного socket-события ref уже актуален.
  useEffect(() => {
    handlersRef.current = handlers
  })

  useEffect(() => {
    if (!enabled) return

    const socket: Socket = io(`${process.env.SERVER_URL}/support`, {
      withCredentials: true
    })

    socket.on('support:message', (event: ISupportSocketMessageEvent) => handlersRef.current.onMessage(event))

    socket.on('support:message-deleted', (event: ISupportSocketMessageDeletedEvent) =>
      handlersRef.current.onMessageDeleted(event)
    )

    socket.on('support:conversation-cleared', (event: ISupportSocketConversationClearedEvent) =>
      handlersRef.current.onConversationCleared(event)
    )

    socket.on('support:conversation-hidden', (event: ISupportSocketConversationHiddenEvent) =>
      handlersRef.current.onConversationHidden(event)
    )

    socket.on('support:error', (payload: { code?: string }) => {
      // NOT_INITIALIZED — сокет открылся раньше, чем виджет успел сходить
      // по REST (см. SupportGateway.handleConnection на бэкенде) — не
      // ошибка пользователя, просто сокет закроется сам. Логируем только
      // для отладки, тостом не беспокоим — участник в этот момент обычно
      // ничего не ждёт.
      if (payload?.code) {
        console.warn('SupportGateway отклонил соединение:', payload.code)
      }
    })

    return () => {
      socket.disconnect()
    }
  }, [enabled])
}
