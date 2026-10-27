'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { conversationsService } from '../services/conversations.service'
import { IConversationListItem } from '../types/message.types'

export function useSetDeal(conversationId: string) {
  const queryClient = useQueryClient()

  const { mutate: setDeal, isPending: isSettingDeal } = useMutation({
    mutationFn: (confirmed: boolean) => conversationsService.setDeal(conversationId, confirmed),

    // Состояние берём из ответа сервера (а не из нажатой кнопки): запрос
    // идемпотентен, и если отметка уже была поставлена с другого
    // устройства, UI покажет реальное значение.
    onSuccess: ({ dealConfirmedAt }) => {
      queryClient.setQueryData<IConversationListItem[]>(['conversations'], old =>
        old?.map(item => (item.id === conversationId ? { ...item, dealConfirmedAt } : item))
      )
    },

    onError: err => toastMessageHandler(err)
  })

  return { setDeal, isSettingDeal }
}
