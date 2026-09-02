import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { TypeSettingsSchema } from '../schemes'
import { userServices } from '../services'

export function useUpdateProfileMutation() {
  const { mutate: update, isPending: isLoadingUpdate } = useMutation({
    mutationKey: ['update profile'],
    mutationFn: (data: TypeSettingsSchema) => userServices.updateProfile(data),
    onSuccess() {
      toast.success('Профиль успешно обновлен')
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { update, isLoadingUpdate }
}
