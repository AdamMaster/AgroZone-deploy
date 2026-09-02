import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { userServices } from '../services'

export function useTwoFactorMutation() {
  const queryClient = useQueryClient()

  const { mutate: toggle2fa, isPending: isToggleLoading } = useMutation({
    mutationKey: ['toggle 2fa'],
    mutationFn: () => userServices.toggleTwoFactor(),

    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Настройки двухфакторной аутентификации изменены')
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError(error: any) {
      toast.error('Не удалось изменить настройки 2FA', {
        description: error.message
      })
    }
  })

  return { toggle2fa, isToggleLoading }
}
