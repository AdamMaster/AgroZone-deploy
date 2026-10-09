import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { useProfile } from '@/features/auth/hooks/use-profile'
import { useAuthStore } from '@/features/auth/store/auth-store'

import { Button } from '@/shared/components/button'
import { FormError } from '@/shared/components/form-error'
import { TextField } from '@/shared/components/text-field'

import { profileApi } from '../api/profile.api'

export function DeleteAccountForm() {
  const clearLocalSession = useAuthStore(state => state.clearLocalSession)
  const { data: profile } = useProfile()
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  // Аккаунт только с входом через Яндекс пароля не имеет — тогда не
  // спрашиваем (так же решает и сервер).
  const needsPassword = profile?.hasPassword ?? true

  const { mutate: deleteAccount, isPending } = useMutation({
    mutationFn: () => profileApi.deleteAccount(needsPassword ? password : undefined),
    // Сессию сервер уже завершил — достаточно забыть ключ на телефоне.
    onSuccess: () => clearLocalSession(),
    onError: error => setFormError(error.message)
  })

  const submit = () => {
    if (needsPassword && !password) {
      setFormError('Введите пароль для подтверждения')
      return
    }

    setFormError(null)
    deleteAccount()
  }

  return (
    <View className='gap-5'>
      <Text className='text-sm text-muted-foreground'>
        Аккаунт будет удалён без возможности восстановления. Ваши объявления пропадут из каталога и будут удалены через
        30 дней. Переписки останутся у собеседников, но будут отображаться от лица удалённого пользователя.
      </Text>

      <FormError message={formError} />

      {needsPassword && (
        <TextField
          label='Пароль'
          value={password}
          onChangeText={setPassword}
          isPassword
          autoCapitalize='none'
          autoComplete='current-password'
          textContentType='password'
          returnKeyType='done'
          onSubmitEditing={submit}
        />
      )}

      <Button title='Удалить аккаунт' variant='destructive' isLoading={isPending} onPress={submit} />
    </View>
  )
}
