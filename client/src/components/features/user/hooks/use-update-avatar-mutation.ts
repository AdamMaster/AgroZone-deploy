import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { userServices } from '../services'

export function useUpdateAvatarMutation() {
  const queryClient = useQueryClient()

  const { mutate: updateAvatar, isPending: isLoadingUpdateAvatar } = useMutation({
    mutationKey: ['update avatar'],
    mutationFn: (file: File) => userServices.updateAvatar(file),
    onSuccess() {
      toast.success('Аватар успешно обновлен')
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { updateAvatar, isLoadingUpdateAvatar }
}
