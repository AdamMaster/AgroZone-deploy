import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UseFormSetError } from 'react-hook-form'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { TypePasswordChangeSchema } from '../schemes'
import { userServices } from '../services'

export function usePasswordChangeMutation() {
  const queryClient = useQueryClient()

  const { mutate: updatePassword, isPending: isUpdatePasswordLoading } = useMutation({
    mutationKey: ['update password profile'],

    mutationFn: (values: TypePasswordChangeSchema) => userServices.updatePassword(values),

    onSuccess() {
      toast.success('Пароль обновлен', {
        description: 'Ваши данные успешно сохранены.'
      })

      // Обновляем данные пользователя в кэше, чтобы кнопка и текст на странице изменились
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    }
  })

  return { updatePassword, isUpdatePasswordLoading }
}
