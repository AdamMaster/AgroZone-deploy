import { zodResolver } from '@hookform/resolvers/zod'
import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { ActivityIndicator, Text, View } from 'react-native'

import { CaptchaCancelledError, useCaptcha } from '@/features/auth/hooks/use-captcha'
import { useProfile } from '@/features/auth/hooks/use-profile'

import { Button } from '@/shared/components/button'
import { FormError } from '@/shared/components/form-error'
import { FormField } from '@/shared/components/form-field'
import { Input, PasswordInput } from '@/shared/components/input'
import { ScreenMessage } from '@/shared/components/screen-message'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { OctagonAlert } from '@/shared/icons/lucide'

import { useRequestEmailChange } from '../hooks/use-profile-mutations'
import { type EmailChangeValues, emailChangeSchema } from '../schemas/profile.schemas'
import { FormIntro } from './form-intro'

const EMAIL_TAKEN_ERROR = 'Этот адрес электронной почты уже используется'
const WRONG_PASSWORD_ERROR = 'Неверный текущий пароль'

// Привязка или смена почты, как FormEmailChange сайта: новый адрес и
// пароль, сервер присылает на новую почту письмо для подтверждения.
export function ChangeEmailForm() {
  const router = useRouter()
  const { data: profile } = useProfile()
  const { requestCaptcha, captchaModal } = useCaptcha()
  const [hasEmail] = useState(() => !!profile?.email)
  const [isDone, setIsDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { mutate: requestEmailChange, isPending } = useRequestEmailChange()
  const primaryColor = useThemeColor('--color-primary')

  const form = useForm<EmailChangeValues>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: { newEmail: '', password: '' }
  })

  const submit = form.handleSubmit(async values => {
    setFormError(null)

    let captchaToken: string
    try {
      captchaToken = await requestCaptcha()
    } catch (error) {
      if (!(error instanceof CaptchaCancelledError)) setFormError('Ошибка проверки безопасности')
      return
    }

    requestEmailChange(
      { ...values, captchaToken },
      {
        onSuccess: () => setIsDone(true),
        onError: error => {
          if (error.message === EMAIL_TAKEN_ERROR) {
            form.setError('newEmail', { message: error.message })
          } else if (error.message === WRONG_PASSWORD_ERROR) {
            form.setError('password', { message: error.message })
          } else {
            setFormError(error.message)
          }
        }
      }
    )
  })

  const screenOptions = <Stack.Screen options={{ title: hasEmail ? 'Изменить адрес почты' : 'Привязка почты' }} />

  if (!profile) {
    return (
      <View className='items-center py-16'>
        {screenOptions}
        <ActivityIndicator colorClassName='accent-primary' />
      </View>
    )
  }

  // Смена почты подтверждается паролем — у аккаунта через Яндекс его нужно
  // сначала установить.
  if (!profile.hasPassword) {
    return (
      <View className='items-center gap-3 py-6'>
        {screenOptions}
        <OctagonAlert size={32} color={primaryColor} />
        <Text className='text-center text-base text-gray-900'>
          Для изменения настроек безопасности необходимо сначала установить пароль для вашего аккаунта.
        </Text>
        <View className='mt-3'>
          <Button title='Установить пароль' variant='secondary' onPress={() => router.replace('/change-password')} />
        </View>
      </View>
    )
  }

  if (isDone) {
    return (
      <>
        {screenOptions}
        <ScreenMessage
          title='Запрос отправлен'
          description='Проверьте новую почту для подтверждения изменений.'
          action={{ title: 'Готово', onPress: () => router.back() }}
        />
      </>
    )
  }

  return (
    <View>
      {screenOptions}
      <FormIntro>
        {hasEmail
          ? 'Введите новую почту. Мы отправим на нее письмо с подтверждением.'
          : 'Введите почту. Мы отправим на нее письмо с подтверждением.'}
      </FormIntro>

      <View className='gap-4'>
        <FormError message={formError} />

        <Controller
          control={form.control}
          name='newEmail'
          render={({ field, fieldState }) => (
            <FormField error={fieldState.error?.message}>
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder={hasEmail ? 'Новая почта' : 'Почта'}
                accessibilityLabel={hasEmail ? 'Новая почта' : 'Почта'}
                keyboardType='email-address'
                autoCapitalize='none'
                autoCorrect={false}
                autoComplete='email'
                textContentType='emailAddress'
              />
            </FormField>
          )}
        />

        <Controller
          control={form.control}
          name='password'
          render={({ field, fieldState }) => (
            <FormField error={fieldState.error?.message}>
              <PasswordInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder='Пароль'
                accessibilityLabel='Пароль'
                autoComplete='current-password'
                textContentType='password'
                returnKeyType='done'
                onSubmitEditing={() => void submit()}
              />
            </FormField>
          )}
        />
      </View>

      <View className='mt-8'>
        <Button title='Подтвердить' variant='secondary' isLoading={isPending} onPress={() => void submit()} />
      </View>

      {captchaModal}
    </View>
  )
}
