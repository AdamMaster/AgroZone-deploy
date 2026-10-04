import { useMutation, useQueryClient } from '@tanstack/react-query'

import { MY_SECURITY_EVENTS_KEY } from '../../security-events/hooks'
import { emailChangeService } from '../services/email-change.service'

export function useChangeEmailMutation() {
  const queryClient = useQueryClient()

  const { mutate: changeEmail, isPending: isChangeEmailLoading } = useMutation({
    mutationKey: ['change email request'],

    mutationFn: ({
      values,
      recaptcha
    }: {
      values: { newEmail: string; password?: string }
      recaptcha?: string
    }) => emailChangeService.request(values, recaptcha),

    // Сам запрос смены почты фиксируется в журнале безопасности (до
    // подтверждения по ссылке) — обновляем "Недавнюю активность".
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: MY_SECURITY_EVENTS_KEY })
    }
  })

  return { changeEmail, isChangeEmailLoading }
}
