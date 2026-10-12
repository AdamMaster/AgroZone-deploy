import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { View } from 'react-native'

import { FormIntro } from '@/features/profile/components/form-intro'

import { Button } from '@/shared/components/button'
import { FormError } from '@/shared/components/form-error'
import { FormField } from '@/shared/components/form-field'
import { PasswordInput } from '@/shared/components/input'

import { type NewPasswordValues, newPasswordSchema } from '../schemas/auth.schemas'

interface NewPasswordFieldsProps {
  onSubmit: (values: NewPasswordValues) => void
  isPending: boolean
  error: string | null
}

// Форма «Новый пароль», как NewPasswordForm сайта: одно поле и «Продолжить».
// Общая для обоих способов сброса — по ссылке из письма (с капчей) и после
// звонка на номер, — отличается только тем, куда уходит пароль.
export function NewPasswordFields({ onSubmit, isPending, error }: NewPasswordFieldsProps) {
  const form = useForm<NewPasswordValues>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '' }
  })

  const submit = form.handleSubmit(onSubmit)

  return (
    <View>
      <FormIntro>Придумайте новый пароль для вашего аккаунта</FormIntro>

      <View className='gap-4'>
        <FormError message={error} />

        <Controller
          control={form.control}
          name='password'
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
                returnKeyType='done'
                onSubmitEditing={() => void submit()}
              />
            </FormField>
          )}
        />
      </View>

      <View className='mt-8'>
        <Button title='Продолжить' variant='secondary' isLoading={isPending} onPress={() => void submit()} />
      </View>
    </View>
  )
}
