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
      // История удалённого диалога у этого пользователя начинается с чистого
      // листа — старые сообщения из кэша убираем, иначе после нового сообщения
      // собеседника они вернулись бы на экран.
      queryClient.removeQueries({ queryKey: ['conversation-messages', conversationId] })
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },

    onError: err => toastMessageHandler(err)
  })

  return { deleteConversation, isDeleting }
}
