import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Text, View } from 'react-native'

import { Button } from '@/shared/components/button'
import { Checkbox } from '@/shared/components/checkbox'
import { FormError } from '@/shared/components/form-error'
import { TextField } from '@/shared/components/text-field'
import { openSitePage } from '@/shared/utils/open-site-page'

import { authApi } from '../api/auth.api'
import { type RegisterFinalValues, registerFinalSchema } from '../schemas/auth.schemas'
import { useAuthStore } from '../store/auth-store'

interface RegisterDetailsStepProps {
  phone: string
  code: string
}

export function RegisterDetailsStep({ phone, code }: RegisterDetailsStepProps) {
  const signIn = useAuthStore(state => state.signIn)
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<RegisterFinalValues>({
    resolver: zodResolver(registerFinalSchema),
    defaultValues: { name: '', password: '', passwordRepeat: '', personalDataConsent: false }
  })

  const { mutate: complete, isPending } = useMutation({
    mutationFn: (values: RegisterFinalValues) => authApi.registerComplete({ ...values, phone, code }),
    onSuccess: session => signIn(session),
    onError: error => setFormError(error.message)
  })

  const onSubmit = form.handleSubmit(values => {
    setFormError(null)
    complete(values)
  })

  return (
    <View className='gap-5'>
      <Text className='text-sm text-muted-foreground'>Номер подтверждён. Осталось указать имя и придумать пароль.</Text>

      <FormError message={formError} />

      <Controller
        control={form.control}
        name='name'
        render={({ field, fieldState }) => (
          <TextField
            label='Имя'
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoComplete='name'
            textContentType='name'
            returnKeyType='next'
            onSubmitEditing={() => form.setFocus('password')}
          />
        )}
      />
      <Controller
        control={form.control}
        name='password'
        render={({ field, fieldState }) => (
          <TextField
            ref={field.ref}
            label='Пароль'
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            isPassword
            autoCapitalize='none'
            autoComplete='new-password'
            textContentType='newPassword'
            returnKeyType='next'
            onSubmitEditing={() => form.setFocus('passwordRepeat')}
          />
        )}
      />
      <Controller
        control={form.control}
        name='passwordRepeat'
        render={({ field, fieldState }) => (
          <TextField
            ref={field.ref}
            label='Повторите пароль'
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            isPassword
            autoCapitalize='none'
            autoComplete='new-password'
            textContentType='newPassword'
            returnKeyType='done'
          />
        )}
      />
      <Controller
        control={form.control}
        name='personalDataConsent'
        render={({ field, fieldState }) => (
          <Checkbox
            checked={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            accessibilityLabel='Согласие на обработку персональных данных и пользовательское соглашение'
            label={
              <Text className='text-sm text-muted-foreground'>
                Я даю согласие на{' '}
                <Text className='text-primary underline' onPress={() => void openSitePage('/privacy')}>
                  обработку персональных данных
                </Text>{' '}
                в соответствии с политикой конфиденциальности и принимаю условия{' '}
                <Text className='text-primary underline' onPress={() => void openSitePage('/terms')}>
                  пользовательского соглашения
                </Text>
              </Text>
            }
          />
        )}
      />

      <Button title='Завершить регистрацию' isLoading={isPending} onPress={onSubmit} />
    </View>
  )
}
