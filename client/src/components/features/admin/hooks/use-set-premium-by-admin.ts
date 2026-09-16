'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { usersAdminService } from '../services/users-admin.service'

// Ручная выдача/продление/снятие premium с карточки пользователя в админке
// (/admin/users/:id, см. SetPremiumDialog) — см.
// UsersAdminService.setPremium/UserService.setPremiumByAdmin на бэкенде.
// Инвалидируем и карточку (там показывается "Premium до"), и список поиска
// (там тоже есть бейдж Premium, см. UserBadges) — оба места должны
// отразить новое значение сразу после сохранения.
export function useSetPremiumByAdmin(userId: string) {
  const queryClient = useQueryClient()

  const { mutate: setPremium, isPending: isLoadingSetPremium } = useMutation({
    mutationKey: ['admin-set-premium', userId],
    mutationFn: (premiumUntil: string | null) => usersAdminService.setPremium(userId, premiumUntil),
    onSuccess() {
      toast.success('Premium обновлён')
      queryClient.invalidateQueries({ queryKey: ['admin-user-detail', userId] })
      queryClient.invalidateQueries({ queryKey: ['admin-users-search'] })
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { setPremium, isLoadingSetPremium }
}
