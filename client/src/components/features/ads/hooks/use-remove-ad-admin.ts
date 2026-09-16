'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services'

// Удаление ЛЮБОГО объявления администратором — с карточки пользователя в
// админке (/admin/users/:id, см. DeleteAdAdminDialog). Отдельно от
// useRemoveAd (тот — для владельца, удаляющего своё объявление из "Мои
// объявления", и инвалидирует другой кэш — 'my-ads').
export function useRemoveAdAdmin() {
  const queryClient = useQueryClient()

  const { mutate: removeAdAsAdmin, isPending: isLoadingRemove } = useMutation({
    mutationKey: ['admin-remove-ad'],
    mutationFn: ({ id }: { id: string; userId: string }) => adsService.removeByAdmin(id),
    onSuccess(_data, { userId }) {
      toast.success('Объявление удалено')
      queryClient.invalidateQueries({ queryKey: ['admin-user-ads', userId] })
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return {
    removeAdAsAdmin,
    isLoadingRemove
  }
}
