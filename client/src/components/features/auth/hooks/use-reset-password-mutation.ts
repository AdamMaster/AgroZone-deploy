import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { TypeResetPasswordSchema } from '../schemes'
import { passwordRecoveryService } from '../services'

export function useResetPasswordMutation() {
  const { mutate: reset, isPending: isLoadingReset } = useMutation({
    mutationKey: ['reset password'],

    mutationFn: ({ values, recaptcha }: { values: TypeResetPasswordSchema; recaptcha: string }) =>
      passwordRecoveryService.reset(values, recaptcha),

    onSuccess() {
      toast.success('Проверьте почту', {
        description: 'Если аккаунт с таким адресом существует, мы отправили на него ссылку для сброса пароля.'
      })
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { reset, isLoadingReset }
}
