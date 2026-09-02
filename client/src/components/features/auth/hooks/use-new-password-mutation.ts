import { useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { TypeNewPasswordSchema } from '../schemes'
import { passwordRecoveryService } from '../services'

export function useNewPasswordMutation() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const token = searchParams.get('token')

  const { mutate: newPassword, isPending: isLoadingNewPassword } = useMutation({
    mutationKey: ['new password'],

    mutationFn: ({ values, recaptcha }: { values: TypeNewPasswordSchema; recaptcha: string }) =>
      passwordRecoveryService.new(values, token, recaptcha),

    onSuccess() {
      toast.success('Пароль успешно изменен', {
        description: 'Теперь вы можете войти в свой аккаунт.'
      })
      router.push('/?auth=true&reason=reset')
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { newPassword, isLoadingNewPassword }
}
