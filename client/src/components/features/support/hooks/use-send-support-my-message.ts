'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { supportService } from '../services/support.service'
import { ISupportMessage } from '../types/support.types'
import { appendSupportMessage } from '../utils/append-support-message'

export function useSendSupportMyMessage() {
  const queryClient = useQueryClient()

  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: (text: string) => supportService.sendMyMessage(text),

    onSuccess: message => {
      // Дописываем сразу, не дожидаясь сокет-эха — см. appendSupportMessage
      // про дедуп, когда оно всё же придёт следом.
      queryClient.setQueryData<ISupportMessage[]>(['support-my-messages'], old => appendSupportMessage(old, message))
      queryClient.invalidateQueries({ queryKey: ['support-my-conversation'] })
    },

    onError: err => toastMessageHandler(err)
  })

  return { sendMessage, isSending }
}
