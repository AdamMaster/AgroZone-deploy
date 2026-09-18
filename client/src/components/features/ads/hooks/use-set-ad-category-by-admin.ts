'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services'

// Ручная смена категории объявления с карточки пользователя в админке
// (/admin/users/:id, см. AdminSetAdCategoryDialog) — см.
// AdsService.setCategoryByAdmin (клиентский сервис) / AdsService.setCategoryByAdmin
// (бэкенд). Тот же принцип, что и у useSetAdExpirationByAdmin: инвалидирует
// тот же ключ ('admin-user-ads', userId) — список объявлений на карточке
// сразу покажет новую категорию.
export function useSetAdCategoryByAdmin() {
  const queryClient = useQueryClient()

  const { mutate: setCategory, isPending: isLoadingSetCategory } = useMutation({
    mutationKey: ['admin-set-ad-category'],
    mutationFn: ({
      id,
      categoryId,
      features,
      unit
    }: {
      id: string
      userId: string
      categoryId: string
      features: Record<string, unknown>
      unit: string
    }) => adsService.setCategoryByAdmin(id, categoryId, features, unit),
    onSuccess(_data, { userId }) {
      toast.success('Категория объявления обновлена')
      queryClient.invalidateQueries({ queryKey: ['admin-user-ads', userId] })
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { setCategory, isLoadingSetCategory }
}
