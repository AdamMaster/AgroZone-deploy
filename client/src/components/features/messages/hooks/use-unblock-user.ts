'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { blockedUsersService } from '../services/blocked-users.service'
import { IBlockedUser } from '../types/message.types'

export function useUnblockUser() {
  const queryClient = useQueryClient()

  const { mutate: unblockUser, isPending: isUnblocking } = useMutation({
    mutationFn: (userId: string) => blockedUsersService.unblock(userId),

    onSuccess: (_data, userId) => {
      queryClient.setQueryData<IBlockedUser[]>(['blocked-users'], old =>
        old ? old.filter(item => item.id !== userId) : old
      )
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] })
      // Разблокировка на бэкенде возвращает скрытые из-за блокировки диалоги
      // (см. BlockedUsersService.unblockUser) — обновляем список сразу же,
      // не дожидаясь поллинга.
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    },

    onError: err => toastMessageHandler(err)
  })

  return { unblockUser, isUnblocking }
}
