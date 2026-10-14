'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { METRIKA_GOALS, reachGoal, toastMessageHandler } from '@/shared/utils'

import { conversationsService } from '../services/conversations.service'
import { IMessage, IMessageDraft } from '../types/message.types'
import { appendMessage } from '../utils/append-message'

export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient()

  const { mutateAsync, isPending: isSending } = useMutation({
    mutationFn: (draft: IMessageDraft) => conversationsService.sendMessage(conversationId, draft),

    onSuccess: message => {
      // Дописываем реальное сообщение в кэш сразу же, не дожидаясь
      // поллинга или эха сокета — иначе своё же только что отправленное
      // сообщение будто "зависает" перед тем, как появиться. Эхо сокета
      // могло прийти раньше этого ответа — appendMessage не дублирует.
      queryClient.setQueryData<IMessage[]>(['conversation-messages', conversationId], old =>
        appendMessage(old, message)
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

  // true — сообщение отправлено; при ошибке (о ней уже сообщил toast) false:
  // композер оставляет набранный текст и фото, чтобы отправить ещё раз.
  const sendMessage = async (draft: IMessageDraft) => {
    try {
      await mutateAsync(draft)

      return true
    } catch {
      return false
    }
  }

  return { sendMessage, isSending }
}
