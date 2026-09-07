'use client'

import { useAppModal } from '@/store'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import React, { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button, Checkbox, Field, FieldError, FieldGroup, Input, InputGroup, Loading, PasswordToggle } from '@/components/ui'

import { useYandexCaptcha } from '@/shared/hooks/use-yandex-captcha'

import { cn } from '@/lib/utils'

import { useRegisterMutation } from '../hooks'
import { RegisterSchema, TypeRegisterSchema } from '../schemes'
import { AuthFormWrapper } from './auth-form-wrapper'

export const FormRegister = () => {
  const { onOpen, setView } = useAppModal()

  const { executeCaptcha, CaptchaWidget } = useYandexCaptcha()

  const form = useForm<TypeRegisterSchema>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      passwordRepeat: '',
      personalDataConsent: false
    }
  })

  const { register, isLoadingRegister } = useRegisterMutation()

  const onSubmit = async (values: TypeRegisterSchema) => {
    try {
      const recaptchaToken = await executeCaptcha()

      register(
        { values, recaptcha: recaptchaToken },
        {
          onSuccess: () => {
            form.reset()
            setView('register-message')
          }
        }
      )
    } catch (error) {
      toast.error('Ошибка проверки безопасности')
    }
  }

  const [showPassword, setShowPassword] = React.useState(false)
  const [showPasswordRepeat, setShowPasswordRepeat] = React.useState(false)

  return (
    <AuthFormWrapper
      heading='Регистрация'
      description='Выберите удобный способ'
      switchButtonLabel={
        <>
          Уже есть аккаунт? <span className='text-primary'>Войти</span>
        </>
      }
      isShowSocial
      onSwitchButtonClick={() => onOpen('login')}
      socialsFooterNotice={
        <>
          Продолжая через Google или Яндекс, вы соглашаетесь на{' '}
          <Link href='/privacy' target='_blank' className='text-primary underline'>
            обработку персональных данных
          </Link>
        </>
      }
    >
      <form id='form-rhf-demo' onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Controller
            name='name'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                <Input {...field} type='name' placeholder='Имя' />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name='email'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                <Input {...field} type='email' placeholder='Почта' />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name='password'
            control={form.control}
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
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                <InputGroup>
                  <Input {...field} type={showPasswordRepeat ? 'text' : 'password'} placeholder='Повторите пароль' />
                  <PasswordToggle isShow={showPasswordRepeat} onClick={() => setShowPasswordRepeat(!showPasswordRepeat)} />
                </InputGroup>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>
        <Controller
          name='personalDataConsent'
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className='mt-4'>
              <label className='flex items-start gap-2 text-left'>
                <Checkbox checked={!!field.value} onCheckedChange={field.onChange} className='mt-0.5 size-4 shrink-0' />
                <span className='text-sm text-gray-500'>
                  Я даю согласие на{' '}
                  <Link href='/privacy' target='_blank' className='text-primary underline'>
                    обработку персональных данных
                  </Link>{' '}
                  в соответствии с политикой конфиденциальности и принимаю условия{' '}
                  <Link href='/terms' target='_blank' className='text-primary underline'>
                    пользовательского соглашения
                  </Link>
                </span>
              </label>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} className='relative' />}
            </Field>
          )}
        />
        <Button variant='secondary' size='lg' type='submit' className='mt-8 w-full'>
          Создать аккаунт
        </Button>
        {isLoadingRegister && <Loading />}
      </form>
      {CaptchaWidget}
    </AuthFormWrapper>
  )
}
