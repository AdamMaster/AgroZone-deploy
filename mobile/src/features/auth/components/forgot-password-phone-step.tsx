import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Text, View } from 'react-native'

import { Button } from '@/shared/components/button'
import { FormError } from '@/shared/components/form-error'
import { TextField } from '@/shared/components/text-field'
import { formatPhoneInput, phoneToApi } from '@/shared/utils/phone'

import { authApi } from '../api/auth.api'
import { type PhoneValues, phoneSchema } from '../schemas/auth.schemas'

interface ForgotPasswordPhoneStepProps {
  onCallRequested: (params: { phone: string; callNumber: string }) => void
}

// Первый шаг сброса по звонку: номер аккаунта. Дальше — звонок на
// проверочный номер, как при регистрации.
export function ForgotPasswordPhoneStep({ onCallRequested }: ForgotPasswordPhoneStepProps) {
  const [formError, setFormError] = useState<string | null>(null)

  const form = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' }
  })

  const { mutate: requestCall, isPending } = useMutation({
    mutationFn: (phone: string) => authApi.requestPasswordResetCall(phone),
    onSuccess: (response, phone) => onCallRequested({ phone, callNumber: response.callNumber }),
    onError: error => setFormError(error.message)
  })

  const onSubmit = form.handleSubmit(values => {
    setFormError(null)
    requestCall(phoneToApi(values.phone))
  })

  return (
    <View className='gap-5'>
      <Text className='text-sm text-muted-foreground'>
        Введите номер телефона вашего аккаунта. Для подтверждения вы сделаете бесплатный звонок — код вводить не нужно.
      </Text>

      <FormError message={formError} />

      <Controller
        control={form.control}
        name='phone'
        render={({ field, fieldState }) => (
          <TextField
            label='Номер телефона'
            placeholder='+7 (999) 123-45-67'
            value={field.value}
            onChangeText={text => field.onChange(formatPhoneInput(text, field.value))}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            keyboardType='phone-pad'
            autoComplete='tel'
            textContentType='telephoneNumber'
            returnKeyType='done'
            onSubmitEditing={onSubmit}
          />
        )}
      />

      <Button title='Продолжить' isLoading={isPending} onPress={onSubmit} />
    </View>
  )
}
