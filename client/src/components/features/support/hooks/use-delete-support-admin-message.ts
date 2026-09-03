'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { supportService } from '../services/support.service'
import { ISupportMessage } from '../types/support.types'
import { removeSupportMessage } from '../utils/remove-support-message'

// Инициатор удаления (сам админ, кликнувший на корзину) убирает сообщение
// из своего кэша сразу тут, не дожидаясь socket-эха ('support:message-deleted',
// см. use-support-realtime.ts) — тот же принцип, что и у
// useSendSupportAdminMessage. Эхо всё равно придёт следом, но
// removeSupportMessage идемпотентен: повторное удаление того же id — no-op.
export function useDeleteSupportAdminMessage(conversationId: string) {
  const queryClient = useQueryClient()

  const { mutate: deleteMessage, isPending: isDeleting } = useMutation({
    mutationFn: (messageId: string) => supportService.deleteAdminMessage(conversationId, messageId),

    onSuccess: (_data, messageId) => {
      queryClient.setQueryData<ISupportMessage[]>(['support-admin-messages', conversationId], old =>
        removeSupportMessage(old, messageId)
      )
      queryClient.invalidateQueries({ queryKey: ['support-admin-conversations'] })
    },

    onError: err => toastMessageHandler(err)
  })

  return { deleteMessage, isDeleting }
}
