'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { METRIKA_GOALS, reachGoal, toastMessageHandler } from '@/shared/utils'

import { conversationsService } from '../services/conversations.service'
import { IMessage } from '../types/message.types'

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient()

  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: (text: string) => conversationsService.sendMessage(conversationId, text),

    onSuccess: message => {
      // Дописываем реальное сообщение в кэш сразу же, не дожидаясь
      // ближайшего поллинга (до 3 секунд) — иначе своё же только что
      // отправленное сообщение будто "зависает" перед тем, как появиться.
      queryClient.setQueryData<IMessage[]>(['conversation-messages', conversationId], old =>
        old ? [...old, message] : [message]
      )
      queryClient.invalidateQueries({ queryKey: ['conversations'] })

      // Цель "message_to_seller" (F15 в ROADMAP.md). Этот хук используется
      // только для переписки по объявлениям (conversationsService) — чат
      // поддержки живёт на отдельных use-send-support-*-message.ts, так что
      // тут гарантированно "написал продавцу", а не что-то ещё.
      reachGoal(METRIKA_GOALS.MESSAGE_TO_SELLER)
    },

    onError: err => toastMessageHandler(err)
  })

  return { sendMessage, isSending }
}
