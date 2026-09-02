'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { conversationsService } from '../services/conversations.service'

export function useDeleteConversation() {
  const queryClient = useQueryClient()

  const { mutate: deleteConversation, isPending: isDeleting } = useMutation({
    mutationFn: (conversationId: string) => conversationsService.deleteConversation(conversationId),

    onSuccess: (_data, conversationId) => {
      // Оптимистично убираем диалог из кэша списка сразу, не дожидаясь
      // ближайшего поллинга — иначе он ещё до 5 секунд провисел бы в списке
      // после нажатия "Удалить".
      queryClient.setQueryData<{ id: string }[]>(['conversations'], old =>
        old ? old.filter(item => item.id !== conversationId) : old
      )
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },

    onError: err => toastMessageHandler(err)
  })

  return { deleteConversation, isDeleting }
}
