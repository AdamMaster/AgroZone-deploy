'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adminUserSecurityEventsKey } from '../../security-events/hooks'
import { usersAdminService } from '../services/users-admin.service'

// Принудительная смена пароля с карточки пользователя в админке
// (/admin/users/:id, см. SetPasswordDialog) — см.
// UsersAdminService.setPassword/UserService.setPasswordByAdmin на бэкенде.
// Инвалидируем карточку — там показывается "пароль установлен" (hasPassword,
// см. UserAdminDetail), после смены пароля у пользователя, у которого его
// раньше не было (вход только через OAuth/звонок), это поле должно
// обновиться на true.
export function useSetPasswordByAdmin(userId: string) {
  const queryClient = useQueryClient()

  const { mutate: setPassword, isPending: isLoadingSetPassword } = useMutation({
    mutationKey: ['admin-set-password', userId],
    mutationFn: (newPassword: string) => usersAdminService.setPassword(userId, newPassword),
    onSuccess() {
      toast.success('Пароль изменён')
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] })
      queryClient.invalidateQueries({ queryKey: adminUserSecurityEventsKey(userId) })
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { setPassword, isLoadingSetPassword }
}
