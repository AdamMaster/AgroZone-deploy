import { useMutation } from '@tanstack/react-query'

import { emailChangeService } from '../services/email-change.service'

export function useChangeEmailMutation() {
  const { mutate: changeEmail, isPending: isChangeEmailLoading } = useMutation({
    mutationKey: ['change email request'],

    mutationFn: ({
      values,
      recaptcha
    }: {
      values: { newEmail: string; password?: string }
      recaptcha?: string
    }) => emailChangeService.request(values, recaptcha)
  })

  return { changeEmail, isChangeEmailLoading }
}
