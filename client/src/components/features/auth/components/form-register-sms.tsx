'use client'

import { useAppModal } from '@/store'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button, Checkbox, Field, FieldError, FieldGroup, Input, InputGroup, Loading, PasswordToggle } from '@/components/ui'

import { useYandexCaptcha } from '@/shared/hooks/use-yandex-captcha'

import { formatPhoneNumber } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { useRegisterSmsMutation } from '../hooks/use-register-sms-mutation'
import {
  RegisterSmsFinalSchema,
  RegisterSmsPhoneSchema,
  TypeRegisterSmsFinalSchema,
  TypeRegisterSmsPhoneSchema
} from '../schemes'
import { AuthFormWrapper } from './auth-form-wrapper'

export const FormRegisterSms = () => {
  const { setView, onOpen, onClose } = useAppModal()
  const [step, setStep] = useState(1)
  const [regData, setRegData] = useState({ phone: '', code: '' })
  const [callNumber, setCallNumber] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const {
    registerSmsStart,
    verifyRegisterCode,
    registerSmsFinal,
    isLoadingSmsFinal,
    useSmsCallbackStatus
  } = useRegisterSmsMutation()

  const { executeCaptcha, CaptchaWidget } = useYandexCaptcha()

  const formPhone = useForm<TypeRegisterSmsPhoneSchema>({
    resolver: zodResolver(RegisterSmsPhoneSchema),
    defaultValues: { phone: '' }
  })

  const formFinal = useForm<TypeRegisterSmsFinalSchema>({
    resolver: zodResolver(RegisterSmsFinalSchema),
    defaultValues: { name: '', password: '', passwordRepeat: '', personalDataConsent: false }
  })

  // Опрашиваем, пока не поступит звонок с проверочного номера — только
  // пока действительно показан экран ожидания (step === 2).
  const { data: callbackStatus } = useSmsCallbackStatus(regData.phone, step === 2 && !!regData.phone)

  useEffect(() => {
    if (step !== 2 || !callbackStatus?.confirmed || !callbackStatus.code) return

    verifyRegisterCode(
      { phone: regData.phone, code: callbackStatus.code },
      {
        onSuccess: () => {
          setRegData(prev => ({ ...prev, code: callbackStatus.code! }))
          setStep(3)
        }
      }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callbackStatus, step])

  const onFormPhoneSubmit = async (data: TypeRegisterSmsPhoneSchema) => {
    try {
      const recaptchaToken = await executeCaptcha()

      // Очищаем номер: "+7 (930) 408-79-71" -> "79304087971"
      const cleanPhone = data.phone.replace(/\D/g, '')
      const cleanedData = { phone: cleanPhone }

      registerSmsStart(
        { values: cleanedData, recaptcha: recaptchaToken },
        {
          onSuccess: response => {
            // Сохраняем в стейт именно очищенный телефон
            setRegData(prev => ({ ...prev, ...cleanedData }))
            setCallNumber(response.callNumber)
            toast.success('Позвоните на указанный номер для подтверждения')
            setStep(2)
          }
        }
      )
    } catch (error) {
      toast.error('Ошибка проверки безопасности')
    }
  }

  const onFormFinalSubmit = (data: TypeRegisterSmsFinalSchema) => {
    const fullData = { ...regData, ...data }

    registerSmsFinal(fullData, {
      onSuccess: () => {
        formPhone.reset()
        formFinal.reset()

        setView('register-sms-message')

        setTimeout(() => {
          onClose()
        }, 2500)
      }
    })
  }

  return (
    <AuthFormWrapper
      heading='Регистрация'
      isShowSocial={false}
      description={
        step === 1 ? 'Введите номер телефона' : step === 2 ? 'Позвоните для подтверждения' : 'Придумайте пароль'
      }
      switchButtonLabel={
        <>
          Уже есть аккаунт? <span className='text-primary'>Войти</span>
        </>
      }
      onSwitchButtonClick={() => onOpen('login')}
    >
      {step === 1 && (
        <form id='form-rhf-demo' onSubmit={formPhone.handleSubmit(onFormPhoneSubmit)}>
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
                  maxLength={18}
                  onChange={e => {
                    const formatted = formatPhoneNumber(e.target.value)
                    onChange(formatted)
                  }}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Button variant='secondary' size='lg' type='submit' className='mt-8 w-full'>
            Продолжить
          </Button>
        </form>
      )}
      {step === 2 && (
        <div className='flex flex-col items-center gap-4 text-center'>
          <p className='text-sm text-gray-500'>Позвоните с номера {formatPhoneNumber(regData.phone)} на</p>
          <p className='text-2xl font-semibold'>{callNumber}</p>
          <p className='text-sm text-gray-500'>
            Звонок бесплатный, трубку можно сразу положить — подтверждение придёт автоматически
          </p>

          <div className='mt-2 flex items-center gap-2 text-sm text-gray-400'>
            <Loader2 className='text-primary size-4 animate-spin' />
            Ждём звонка...
          </div>

          <button
            type='button'
            className='text-muted-foreground mt-2 text-sm underline'
            onClick={() => setStep(1)}
          >
            Указать другой номер
          </button>
        </div>
      )}
      {step === 3 && (
        <form id='form-rhf-demo' onSubmit={formFinal.handleSubmit(onFormFinalSubmit)}>
          <FieldGroup>
            <Controller
              name='name'
              control={formFinal.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                  <Input {...field} placeholder='Ваше имя' />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name='password'
              control={formFinal.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                  <InputGroup>
                    <Input {...field} type={showPassword ? 'text' : 'password'} placeholder='Пароль' />
                    <PasswordToggle isShow={showPassword} onClick={() => setShowPassword(!showPassword)} />
                  </InputGroup>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name='passwordRepeat'
              control={formFinal.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                  <InputGroup>
                    <Input {...field} type={showPassword ? 'text' : 'password'} placeholder='Повторите пароль' />
                    <PasswordToggle isShow={showPassword} onClick={() => setShowPassword(!showPassword)} />
                  </InputGroup>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
          <Controller
            name='personalDataConsent'
            control={formFinal.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className='mt-4'>
                <label className='flex items-start gap-2 text-left'>
                  <Checkbox
                    checked={!!field.value}
                    onCheckedChange={field.onChange}
                    className='mt-0.5 size-4 shrink-0'
                  />
                  <span className='text-sm text-gray-500'>
                    Я даю согласие на{' '}
                    <Link href='/privacy' target='_blank' className='text-primary underline'>
                      обработку персональных данных
                    </Link>{' '}
                    в соответствии с политикой конфиденциальности
                  </span>
                </label>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} className='relative' />}
              </Field>
            )}
          />
          <Button variant='secondary' size='lg' type='submit' className='mt-8 w-full'>
            Завершить регистрацию
          </Button>
          {isLoadingSmsFinal && <Loading />}
        </form>
      )}
      {CaptchaWidget}
    </AuthFormWrapper>
  )
}
