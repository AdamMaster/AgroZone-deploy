'use client'

import { useAppModal } from '@/store'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Button, Field, FieldError, FieldGroup, Input, InputGroup, Loading, PasswordToggle } from '@/components/ui'

import { formatPhoneNumber, phoneToApi } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { useResetPasswordPhoneMutation } from '../hooks'
import { NewPasswordSchema, PhoneSchema, TypeNewPasswordSchema, TypePhoneSchema } from '../schemes'
import { AuthFormWrapper } from './auth-form-wrapper'
import { CallConfirmationStep } from './call-confirmation-step'

interface FormResetPasswordPhoneProps {
  onSwitchToEmail: () => void
}

const DESCRIPTIONS = {
  1: 'Введите номер телефона вашего аккаунта',
  2: 'Позвоните для подтверждения',
  3: 'Придумайте новый пароль для вашего аккаунта'
} as const

// Сброс пароля по звонку на номер — основной способ (у большинства аккаунтов
// вход по телефону, а почта не привязана). Три шага, как у регистрации по
// звонку: номер → звонок на проверочный номер → новый пароль. Сервер
// перепроверяет звонок и на последнем шаге, так что пропустить второй шаг
// нельзя.
export const FormResetPasswordPhone = ({ onSwitchToEmail }: FormResetPasswordPhoneProps) => {
  const { onOpen } = useAppModal()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [phone, setPhone] = useState('')
  const [callNumber, setCallNumber] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const { startPhoneReset, isLoadingPhoneStart, newPasswordByPhone, isLoadingNewPasswordByPhone, useResetCallStatus } =
    useResetPasswordPhoneMutation()

  const formPhone = useForm<TypePhoneSchema>({
    resolver: zodResolver(PhoneSchema),
    defaultValues: { phone: '' }
  })

  const formPassword = useForm<TypeNewPasswordSchema>({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: { password: '' }
  })

  // Опрашиваем, пока не поступит звонок с проверочного номера — только
  // пока действительно показан экран ожидания. Как только звонок подтверждён,
  // переходим к новому паролю.
  const { data: callbackStatus, error: callbackError } = useResetCallStatus(phone, step === 2)
  const confirmedCode = callbackStatus?.confirmed ? callbackStatus.code : undefined
  const currentStep = step === 2 && confirmedCode ? 3 : step

  const onFormPhoneSubmit = (data: TypePhoneSchema) => {
    // Очищаем номер: "+7 (930) 408-79-71" -> "+79304087971"
    const cleanPhone = phoneToApi(data.phone)

    startPhoneReset(
      { phone: cleanPhone },
      {
        onSuccess: response => {
          setPhone(cleanPhone)
          setCallNumber(response.callNumber)
          setStep(2)
        }
      }
    )
  }

  const onFormPasswordSubmit = (data: TypeNewPasswordSchema) => {
    if (!confirmedCode) return

    newPasswordByPhone(
      { phone, code: confirmedCode, password: data.password },
      {
        onSuccess: () => {
          formPhone.reset()
          formPassword.reset()
          onOpen('login-after-reset')
        }
      }
    )
  }

  return (
    <AuthFormWrapper
      heading='Сброс пароля'
      description={DESCRIPTIONS[currentStep]}
      switchButtonLabel={<>Войти в аккаунт</>}
      onSwitchButtonClick={() => onOpen('login')}
      isShowSocial={false}
    >
      {currentStep === 1 && (
        <form onSubmit={formPhone.handleSubmit(onFormPhoneSubmit)}>
          <Controller
            name='phone'
            control={formPhone.control}
            render={({ field: { onChange, value, ...field }, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                <Input
                  {...field}
                  value={value}
                  type='tel'
                  placeholder='+7 (999) 999-99-99'
                  maxLength={24}
                  onChange={e => onChange(formatPhoneNumber(e.target.value))}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Button variant='secondary' size='lg' type='submit' className='mt-8 w-full'>
            Продолжить
          </Button>
          <button type='button' className='text-muted-foreground mt-4 text-sm underline' onClick={onSwitchToEmail}>
            Сбросить по почте
          </button>
        </form>
      )}
      {currentStep === 2 && (
        <CallConfirmationStep
          phone={phone}
          callNumber={callNumber}
          error={callbackError?.message}
          onChangePhone={() => setStep(1)}
        />
      )}
      {currentStep === 3 && (
        <form onSubmit={formPassword.handleSubmit(onFormPasswordSubmit)}>
          <FieldGroup>
            <Controller
              name='password'
              control={formPassword.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                  <InputGroup>
                    <Input {...field} type={showPassword ? 'text' : 'password'} placeholder='Новый пароль' />
                    <PasswordToggle isShow={showPassword} onClick={() => setShowPassword(!showPassword)} />
                  </InputGroup>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <Button variant='secondary' size='lg' type='submit' className='mt-10 w-full'>
            Продолжить
          </Button>
        </form>
      )}
      {(isLoadingPhoneStart || isLoadingNewPasswordByPhone) && <Loading />}
    </AuthFormWrapper>
  )
}
