import { zodResolver } from '@hookform/resolvers/zod'
import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'

import { useProfile } from '@/features/auth/hooks/use-profile'

import { Button } from '@/shared/components/button'
import { FormError } from '@/shared/components/form-error'
import { FormField } from '@/shared/components/form-field'
import { PasswordInput } from '@/shared/components/input'
import { ScreenMessage } from '@/shared/components/screen-message'

import { useUpdatePassword } from '../hooks/use-profile-mutations'
import { type PasswordChangeValues, passwordChangeSchema } from '../schemas/profile.schemas'
import { FormIntro } from './form-intro'

// Ответы сервера, относящиеся к полю «Текущий пароль», — показываем у
// поля, как сайт.
const CURRENT_PASSWORD_ERRORS = ['Необходимо указать текущий пароль', 'Текущий пароль указан неверно']

// Смена пароля, а у аккаунта без пароля (вход через Яндекс) — установка
// первого пароля, как FormPasswordChange сайта.
export function ChangePasswordForm() {
  const router = useRouter()
  const { data: profile } = useProfile()
  // Режим фиксируем при открытии: после успешной установки у профиля
  // появится пароль, а заголовок окна меняться не должен.
  const [isFirstPassword] = useState(() => profile?.hasPassword === false)
  const [isDone, setIsDone] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const { mutate: updatePassword, isPending } = useUpdatePassword()

  const form = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
  })

  const submit = form.handleSubmit(values => {
    setFormError(null)
    updatePassword(
      { currentPassword: isFirstPassword ? undefined : values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => setIsDone(true),
        onError: error => {
          if (CURRENT_PASSWORD_ERRORS.includes(error.message)) {
            form.setError('currentPassword', { message: error.message })
          } else {
            setFormError(error.message)
          }
        }
      }
    )
  })

  const title = isFirstPassword ? 'Установить пароль' : 'Изменить пароль'

  if (isDone) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ScreenMessage
          title='Пароль обновлен!'
          description='Ваши данные успешно сохранены.'
          action={{ title: 'Готово', onPress: () => router.back() }}
        />
      </>
    )
  }

  return (
    <View>
      <Stack.Screen options={{ title }} />
      <FormIntro>
        {isFirstPassword
          ? 'Установите пароль для прямого доступа к аккаунту'
          : 'Для изменения пароля заполните все поля ниже'}
      </FormIntro>

      <View className='gap-4'>
        <FormError message={formError} />

        {!isFirstPassword && (
          <Controller
            control={form.control}
            name='currentPassword'
            render={({ field, fieldState }) => (
              <FormField error={fieldState.error?.message}>
                <PasswordInput
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  placeholder='Текущий пароль'
                  accessibilityLabel='Текущий пароль'
                  autoComplete='current-password'
                  textContentType='password'
                />
              </FormField>
            )}
          />
        )}

        <Controller
          control={form.control}
          name='newPassword'
          render={({ field, fieldState }) => (
            <FormField error={fieldState.error?.message}>
              <PasswordInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder='Новый пароль'
                accessibilityLabel='Новый пароль'
                autoComplete='new-password'
                textContentType='newPassword'
              />
            </FormField>
          )}
        />

        <Controller
          control={form.control}
          name='confirmPassword'
          render={({ field, fieldState }) => (
            <FormField error={fieldState.error?.message}>
              <PasswordInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                placeholder='Подтвердить новый пароль'
                accessibilityLabel='Подтвердить новый пароль'
                autoComplete='new-password'
                textContentType='newPassword'
                returnKeyType='done'
                onSubmitEditing={submit}
              />
            </FormField>
          )}
        />
      </View>

      <View className='mt-8'>
        <Button title='Подтвердить' variant='secondary' isLoading={isPending} onPress={submit} />
      </View>
    </View>
  )
}
