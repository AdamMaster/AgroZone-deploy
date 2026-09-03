'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { supportService } from '../services/support.service'
import { ISupportMessage } from '../types/support.types'

// "Удалить всё" — то же самое опустошение кэша, что делает и
// handleConversationCleared в use-support-realtime.ts на socket-эхо, но
// сразу тут, не дожидаясь сокета (тот же принцип, что и у остальных
// support-мутаций).
export function useClearSupportAdminMessages(conversationId: string) {
  const queryClient = useQueryClient()

  const { mutate: clearMessages, isPending: isClearing } = useMutation({
    mutationFn: () => supportService.deleteAllAdminMessages(conversationId),

    onSuccess: () => {
      queryClient.setQueryData<ISupportMessage[]>(['support-admin-messages', conversationId], [])
      queryClient.invalidateQueries({ queryKey: ['support-admin-conversations'] })
    },

    onError: err => toastMessageHandler(err)
  })

  return { clearMessages, isClearing }
}
