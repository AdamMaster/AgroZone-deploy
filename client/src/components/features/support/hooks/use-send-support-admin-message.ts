'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { supportService } from '../services/support.service'
import { ISupportMessage } from '../types/support.types'
import { appendSupportMessage } from '../utils/append-support-message'

export function useSendSupportAdminMessage(conversationId: string) {
  const queryClient = useQueryClient()

  const { mutate: sendMessage, isPending: isSending } = useMutation({
    mutationFn: (text: string) => supportService.sendAdminMessage(conversationId, text),

    onSuccess: message => {
      queryClient.setQueryData<ISupportMessage[]>(['support-admin-messages', conversationId], old =>
        appendSupportMessage(old, message)
      )
      queryClient.invalidateQueries({ queryKey: ['support-admin-conversations'] })
    },

    onError: err => toastMessageHandler(err)
  })

  return { sendMessage, isSending }
}
