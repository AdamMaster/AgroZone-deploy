'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { blockedUsersService } from '../services/blocked-users.service'
import { IConversationListItem } from '../types/message.types'

export function useBlockUser() {
  const queryClient = useQueryClient()

  const { mutate: blockUser, isPending: isBlocking } = useMutation({
    mutationFn: (userId: string) => blockedUsersService.block(userId),

    onSuccess: (_data, userId) => {
      // Блокировка на бэкенде уже прячет диалоги с этим человеком (см.
      // BlockedUsersService.blockUser) — убираем их из кэша списка сразу же,
      // не дожидаясь ближайшего поллинга, как и при обычном удалении диалога.
      queryClient.setQueryData<IConversationListItem[]>(['conversations'], old =>
        old ? old.filter(item => item.counterpart.id !== userId) : old
      )
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] })
    },

    onError: err => toastMessageHandler(err)
  })

  return { blockUser, isBlocking }
}
