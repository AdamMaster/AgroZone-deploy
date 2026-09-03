'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { supportService } from '../services/support.service'
import { ISupportAdminConversationListItem } from '../types/support.types'

// "Удалить чат" в списке — НЕ про содержимое переписки (см.
// useClearSupportAdminMessages), а про то, чтобы тикет пропал из
// собственного инбокса админа; переписка участника не трогается вообще
// (см. SupportService.hideConversation на бэкенде). Optimistic filter тут
// же, не дожидаясь socket-эха (см. handleConversationHidden в
// use-support-realtime.ts) — тот же принцип, что и у остальных
// support-мутаций.
export function useHideSupportAdminConversation() {
  const queryClient = useQueryClient()

  const { mutate: hideConversation, isPending: isHiding } = useMutation({
    mutationFn: (conversationId: string) => supportService.hideAdminConversation(conversationId),

    onSuccess: (_data, conversationId) => {
      queryClient.setQueryData<ISupportAdminConversationListItem[]>(['support-admin-conversations'], old =>
        old?.filter(item => item.id !== conversationId)
      )
    },

    onError: err => toastMessageHandler(err)
  })

  return { hideConversation, isHiding }
}
