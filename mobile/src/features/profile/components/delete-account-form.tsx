import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { useProfile } from '@/features/auth/hooks/use-profile'
import { useAuthStore } from '@/features/auth/store/auth-store'

import { Button } from '@/shared/components/button'
import { FormError } from '@/shared/components/form-error'
import { FormField } from '@/shared/components/form-field'
import { PasswordInput } from '@/shared/components/input'

import { profileApi } from '../api/profile.api'
import { FormIntro } from './form-intro'

// Ответы сервера, относящиеся к полю «Пароль», — показываем у поля, как сайт
// (UserService.deleteAccount).
const PASSWORD_ERRORS = ['Неверный пароль', 'Необходимо указать пароль для подтверждения']

export function DeleteAccountForm() {
  const router = useRouter()
  const clearLocalSession = useAuthStore(state => state.clearLocalSession)
  const { data: profile } = useProfile()
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Аккаунт только с входом через Яндекс пароля не имеет — тогда не
  // спрашиваем (так же решает и сервер).
  const needsPassword = profile?.hasPassword ?? true

  const { mutate: deleteAccount, isPending } = useMutation({
    mutationFn: () => profileApi.deleteAccount(needsPassword ? password : undefined),
    // Сессию сервер уже завершил — достаточно забыть ключ на телефоне.
    onSuccess: () => clearLocalSession(),
    onError: error => {
      if (PASSWORD_ERRORS.includes(error.message)) setPasswordError(error.message)
      else setFormError(error.message)
    }
  })

  const submit = () => {
    setFormError(null)

    if (needsPassword && !password) {
      setPasswordError('Введите пароль для подтверждения')
      return
    }

    setPasswordError(null)
    deleteAccount()
  }

  const changePassword = (value: string) => {
    setPassword(value)
    setPasswordError(null)
  }

  return (
    <View>
      <FormIntro>Это действие необратимо</FormIntro>

      <Text className='mb-6 text-sm text-gray-500'>
        Аккаунт будет удалён без возможности восстановления. Ваши объявления пропадут из каталога и будут удалены через
        30 дней. Переписки останутся у собеседников, но будут отображаться от лица удалённого пользователя.
      </Text>

      <View className='gap-4'>
        <FormError message={formError} />

        {needsPassword && (
          <FormField error={passwordError ?? undefined}>
            <PasswordInput
              value={password}
              onChangeText={changePassword}
              placeholder='Пароль'
              accessibilityLabel='Пароль'
              autoComplete='current-password'
              textContentType='password'
              returnKeyType='done'
              onSubmitEditing={submit}
            />
          </FormField>
        )}
      </View>

      <View className='mt-8 flex-row flex-wrap gap-2'>
        <Button title='Отмена' variant='outline' disabled={isPending} onPress={() => router.back()} />
        <Button title='Удалить аккаунт' variant='destructive' isLoading={isPending} onPress={submit} />
      </View>
    </View>
  )
}
