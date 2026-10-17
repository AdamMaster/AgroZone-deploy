import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { type ReactNode, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Text, View } from 'react-native'

import { Button } from '@/shared/components/button'
import { FormError } from '@/shared/components/form-error'
import { TextField } from '@/shared/components/text-field'
import { formatPhoneInput, phoneToApi } from '@/shared/utils/phone'

import { type PhoneValues, phoneSchema } from '../schemas/auth.schemas'

interface PhoneRequestStepProps {
  // Пояснение над полем.
  description: string
  // Запрос звонка на проверочный номер (регистрация, сброс пароля).
  requestCall: (phone: string) => Promise<{ callNumber: string }>
  onCallRequested: (params: { phone: string; callNumber: string }) => void
  // Номер, уже набранный на форме входа.
  initialPhone?: string
  // Введённое значение — для переноса обратно на форму входа.
  onValueChange?: (value: string) => void
  // Действие под текстом ошибки, зависящее от самой ошибки (например,
  // «Войти с этим номером», если номер уже зарегистрирован).
  renderErrorAction?: (error: Error) => ReactNode
}

// Первый шаг звонкового подтверждения: номер телефона. Дальше — звонок на
// проверочный номер (CallConfirmationStep). Общий для регистрации и сброса
// пароля.
export function PhoneRequestStep({
  description,
  requestCall,
  onCallRequested,
  initialPhone,
  onValueChange,
  renderErrorAction
}: PhoneRequestStepProps) {
  const [requestError, setRequestError] = useState<Error | null>(null)

  const form = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: initialPhone ? formatPhoneInput(initialPhone) : '' }
  })

  const { mutate: sendRequest, isPending } = useMutation({
    mutationFn: requestCall,
    onSuccess: (response, phone) => onCallRequested({ phone, callNumber: response.callNumber }),
    onError: error => setRequestError(error)
  })

  const onSubmit = form.handleSubmit(values => {
    setRequestError(null)
    sendRequest(phoneToApi(values.phone))
  })

  return (
    <View className='gap-5'>
      <Text className='text-sm text-muted-foreground'>{description}</Text>

      <FormError message={requestError?.message} />
      {requestError && renderErrorAction?.(requestError)}

      <Controller
        control={form.control}
        name='phone'
        render={({ field, fieldState }) => (
          <TextField
            label='Номер телефона'
            placeholder='+7 (999) 123-45-67'
            value={field.value}
            onChangeText={text => {
              const formatted = formatPhoneInput(text, field.value)

              field.onChange(formatted)
              onValueChange?.(formatted)
            }}
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
