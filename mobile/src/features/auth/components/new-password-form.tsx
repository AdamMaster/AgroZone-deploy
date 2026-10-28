import { useMutation } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'

import { ScreenMessage } from '@/shared/components/screen-message'

import { authApi } from '../api/auth.api'
import { CaptchaCancelledError, useCaptcha } from '../hooks/use-captcha'
import { useFinishPasswordReset } from '../hooks/use-finish-password-reset'
import { useIsSignedIn } from '../hooks/use-is-signed-in'
import type { NewPasswordValues } from '../schemas/auth.schemas'
import { NewPasswordFields } from './new-password-fields'

// Новый пароль по ссылке из письма о сбросе, как NewPasswordForm сайта.
// Ссылка https://agro-zone.ru/new-password?token=… открывается в
// приложении, если оно установлено (см. intentFilters / associatedDomains
// в app.json), иначе — на сайте.
export function NewPasswordForm() {
  const router = useRouter()
  const { token } = useLocalSearchParams<{ token?: string }>()
  const isSignedIn = useIsSignedIn()
  const finish = useFinishPasswordReset()
  const { requestCaptcha, captchaModal } = useCaptcha()
  const [formError, setFormError] = useState<string | null>(null)

  const { mutate: setNewPassword, isPending } = useMutation({
    mutationFn: async (values: NewPasswordValues) => {
      const captchaToken = await requestCaptcha()

      return authApi.setNewPassword({ token: token ?? '', password: values.password, captchaToken })
    },
    onSuccess: finish,
    onError: error => {
      if (error instanceof CaptchaCancelledError) return
      setFormError(error.message)
    }
  })

  if (!token) {
    return (
      <ScreenMessage
        title='Ссылка недействительна'
        description='Запросите сброс пароля ещё раз.'
        action={{
          title: isSignedIn ? 'На главную' : 'Сбросить пароль',
          onPress: () => router.replace(isSignedIn ? '/' : '/forgot-password')
        }}
      />
    )
  }

  return (
    <>
      <NewPasswordFields
        isPending={isPending}
        error={formError}
        onSubmit={values => {
          setFormError(null)
          setNewPassword(values)
        }}
      />
      {captchaModal}
    </>
  )
}
