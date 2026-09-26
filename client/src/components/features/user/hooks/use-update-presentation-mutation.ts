import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { userServices } from '../services'

// Тот же паттерн, что и useUpdateAvatarMutation — отдельный хук, а не
// расширение того же, потому что грузим разные поля профиля и на разные
// эндпоинты, и ошибки/тексты тостов у них свои.
export function useUpdatePresentationMutation() {
  const queryClient = useQueryClient()

  const { mutate: updatePresentation, isPending: isLoadingUpdatePresentation } = useMutation({
    mutationKey: ['update presentation'],
    mutationFn: (file: File) => userServices.updatePresentation(file),
    onSuccess() {
      toast.success('Презентация загружена')
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { updatePresentation, isLoadingUpdatePresentation }
}
