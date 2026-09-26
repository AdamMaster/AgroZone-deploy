import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { userServices } from '../services'

export function useRemovePresentationMutation() {
  const queryClient = useQueryClient()

  const { mutate: removePresentation, isPending: isLoadingRemovePresentation } = useMutation({
    mutationKey: ['remove presentation'],
    mutationFn: () => userServices.removePresentation(),
    onSuccess() {
      toast.success('Презентация удалена')
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { removePresentation, isLoadingRemovePresentation }
}
