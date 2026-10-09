import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, Text, View } from 'react-native'

import { Button } from '@/shared/components/button'
import { FormError } from '@/shared/components/form-error'
import { TextField } from '@/shared/components/text-field'
import { formatPhoneInput, phoneToApi } from '@/shared/utils/phone'

import { ApiError } from '@/lib/api/api-error'

import { authApi } from '../api/auth.api'
import { type RegisterPhoneValues, registerPhoneSchema } from '../schemas/auth.schemas'

interface RegisterPhoneStepProps {
  onCallRequested: (params: { phone: string; callNumber: string }) => void
}

export function RegisterPhoneStep({ onCallRequested }: RegisterPhoneStepProps) {
  const router = useRouter()
  const [formError, setFormError] = useState<string | null>(null)
  // 409 — номер уже зарегистрирован: вместо тупика предлагаем войти.
  const [isPhoneTaken, setIsPhoneTaken] = useState(false)

  const form = useForm<RegisterPhoneValues>({
    resolver: zodResolver(registerPhoneSchema),
    defaultValues: { phone: '' }
  })

  const { mutate: requestCall, isPending } = useMutation({
    mutationFn: (phone: string) => authApi.registerStart(phone),
    onSuccess: (response, phone) => onCallRequested({ phone, callNumber: response.callNumber }),
    onError: error => {
      setIsPhoneTaken(error instanceof ApiError && error.statusCode === 409)
      setFormError(error.message)
    }
  })

  const onSubmit = form.handleSubmit(values => {
    setFormError(null)
    setIsPhoneTaken(false)
    requestCall(phoneToApi(values.phone))
  })

  return (
    <View className='gap-5'>
      <Text className='text-sm text-muted-foreground'>
        Для подтверждения номера вы сделаете бесплатный звонок — код вводить не нужно.
      </Text>

      <FormError message={formError} />
      {isPhoneTaken && (
        <Pressable accessibilityRole='link' hitSlop={8} onPress={() => router.replace('/login')}>
          <Text className='text-sm font-semibold text-primary'>Войти с этим номером</Text>
        </Pressable>
      )}

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
