'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { usersAdminService } from '../services/users-admin.service'

// Задать/сменить email с карточки пользователя в админке (/admin/users/:id,
// см. SetEmailDialog) — см. UsersAdminService.setEmail/
// UserService.setEmailByAdmin на бэкенде.
export function useSetEmailByAdmin(userId: string) {
  const queryClient = useQueryClient()

  const { mutate: setEmail, isPending: isLoadingSetEmail } = useMutation({
    mutationKey: ['admin-set-email', userId],
    mutationFn: (newEmail: string) => usersAdminService.setEmail(userId, newEmail),
    onSuccess() {
      toast.success('Email обновлён')
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] })
      queryClient.invalidateQueries({ queryKey: ['admin-users-search'] })
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { setEmail, isLoadingSetEmail }
}
