'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

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
    },

    onError: err => toastMessageHandler(err)
  })

  return { sendMessage, isSending }
}
