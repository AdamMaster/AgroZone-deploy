'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services'

// Ручная правка срока жизни объявления с карточки пользователя в админке
// (/admin/users/:id, см. SetAdExpirationDialog) — см.
// AdsService.setExpirationByAdmin (клиентский сервис)/AdsService.setExpirationByAdmin
// (бэкенд). Отдельно от useRemoveAdAdmin: инвалидирует тот же ключ
// ('admin-user-ads', userId) — список объявлений на карточке должен сразу
// показать новую дату (и, если применимо, новый статус EXPIRED).
export function useSetAdExpirationByAdmin() {
  const queryClient = useQueryClient()

  const { mutate: setExpiration, isPending: isLoadingSetExpiration } = useMutation({
    mutationKey: ['admin-set-ad-expiration'],
    mutationFn: ({ id, expiresAt }: { id: string; userId: string; expiresAt: string | null }) =>
      adsService.setExpirationByAdmin(id, expiresAt),
    onSuccess(_data, { userId }) {
      toast.success('Срок жизни объявления обновлён')
      queryClient.invalidateQueries({ queryKey: ['admin-user-ads', userId] })
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { setExpiration, isLoadingSetExpiration }
}
