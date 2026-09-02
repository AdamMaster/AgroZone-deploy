'use client'

import { useAppModal } from '@/store'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button, Field, FieldError, FieldGroup, Input, InputGroup, Loading } from '@/components/ui'

import { useYandexCaptcha } from '@/shared/hooks/use-yandex-captcha'

import { cn } from '@/lib/utils'

import { useNewPasswordMutation } from '../hooks'
import { NewPasswordSchema, TypeNewPasswordSchema } from '../schemes'
import { AuthFormWrapper } from './auth-form-wrapper'

export const NewPasswordForm = () => {
  const { executeCaptcha, CaptchaWidget } = useYandexCaptcha()

  const form = useForm<TypeNewPasswordSchema>({
    resolver: zodResolver(NewPasswordSchema),
    defaultValues: {
      password: ''
    }
  })

  const { newPassword, isLoadingNewPassword } = useNewPasswordMutation()

  const onSubmit = async (values: TypeNewPasswordSchema) => {
    try {
      const recaptchaToken = await executeCaptcha()

      newPassword({ values, recaptcha: recaptchaToken })
    } catch (error) {
      toast.error('Ошибка проверки безопасности')
    }
  }

  const { onOpen } = useAppModal()

  const [showPassword, setShowPassword] = useState(false)

  return (
    <AuthFormWrapper
      heading='Новый пароль'
      description='Придумайте новый пароль для вашего аккаунта'
      className='max-w-105 rounded-xl border bg-white p-8'
      isShowSocial={false}
    >
      <form id='form-rhf-demo' onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Controller
            name='password'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                <InputGroup>
                  <Input {...field} type={showPassword ? 'text' : 'password'} placeholder='Новый пароль' />
                  <button
                    type='button'
                    className='absolute top-1/2 right-2.5 h-auto -translate-y-[50%] hover:bg-transparent'
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? (
                      <Eye className='text-muted-foreground h-4 w-4' />
                    ) : (
                      <EyeOff className='text-muted-foreground h-4 w-4' />
                    )}
                  </button>
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
      <button className='mt-8 block w-full text-center hover:opacity-80' onClick={() => onOpen('login')}>
        Войти в аккаунт
      </button>
      {CaptchaWidget}
      {isLoadingNewPassword && <Loading />}
    </AuthFormWrapper>
  )
}
