import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'

import { FormIntro } from '@/features/profile/components/form-intro'

import { Button } from '@/shared/components/button'
import { FormError } from '@/shared/components/form-error'
import { FormField } from '@/shared/components/form-field'
import { Input } from '@/shared/components/input'

import { authApi } from '../api/auth.api'
import { CaptchaCancelledError, useCaptcha } from '../hooks/use-captcha'
import { type ResetPasswordValues, resetPasswordSchema } from '../schemas/auth.schemas'

interface ForgotPasswordFormProps {
  onSent: () => void
}

// Сброс пароля по почте, как FormResetPassword сайта: почта и капча, на
// почту уходит ссылка на страницу нового пароля (ForgotPasswordFlow — запасной
// способ рядом со сбросом по звонку).
export function ForgotPasswordForm({ onSent }: ForgotPasswordFormProps) {
  const { requestCaptcha, captchaModal } = useCaptcha()
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' }
  })

  const { mutate: requestReset, isPending } = useMutation({
    mutationFn: async (values: ResetPasswordValues) => {
      const captchaToken = await requestCaptcha()

      return authApi.requestPasswordReset({ email: values.email, captchaToken })
    },
    onSuccess: onSent,
    onError: error => {
      if (error instanceof CaptchaCancelledError) return
      setFormError(error.message)
    }
  })

  const submit = form.handleSubmit(values => {
    setFormError(null)
    requestReset(values)
  })

  return (
    <View>
      <FormIntro>Введите вашу почту, и мы отправим на неё ссылку для восстановления пароля</FormIntro>

      <View className='gap-4'>
        <FormError message={formError} />

        <Controller
          control={form.control}
          name='email'
          render={({ field, fieldState }) => (
            <FormField error={fieldState.error?.message}>
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder='Почта'
                accessibilityLabel='Почта'
                keyboardType='email-address'
                autoCapitalize='none'
                autoCorrect={false}
                autoComplete='email'
                textContentType='emailAddress'
                returnKeyType='done'
                onSubmitEditing={() => void submit()}
              />
            </FormField>
          )}
        />
      </View>

      <View className='mt-8'>
        <Button title='Сбросить' variant='secondary' isLoading={isPending} onPress={() => void submit()} />
      </View>

      {captchaModal}
    </View>
  )
}
