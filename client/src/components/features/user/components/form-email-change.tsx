'use client'

import { useAppModal } from '@/store'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, OctagonAlert } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button, Field, FieldError, FieldGroup, Input, InputGroup, Loading } from '@/components/ui'

import { useProfile } from '@/shared/hooks'
import { useYandexCaptcha } from '@/shared/hooks/use-yandex-captcha'

import { cn } from '@/lib/utils'

import { useChangeEmailMutation } from '../hooks'
import { EmailChangeShema, TypeEmailChangeShema } from '../schemes'
import { UserFormWrapper } from './user-form-wrapper'

export const FormEmailChange = () => {
  const { user } = useProfile()
  const [showPassword, setShowPassword] = useState(false)
  const { onOpen, onClose, setView } = useAppModal()

  const { executeCaptcha, CaptchaWidget } = useYandexCaptcha()

  const form = useForm<TypeEmailChangeShema>({
    resolver: zodResolver(EmailChangeShema),
    defaultValues: {
      newEmail: '',
      password: ''
    }
  })

  const { changeEmail, isChangeEmailLoading } = useChangeEmailMutation()

  const onSubmit = async (values: TypeEmailChangeShema) => {
    try {
      const recaptchaToken = await executeCaptcha()

      changeEmail(
        { values, recaptcha: recaptchaToken },
        {
          onSuccess: () => {
            setView('change-email-message')
          },
          onError: error => {
            const errorMessage = error.message

            if (errorMessage === 'Этот адрес электронной почты уже используется') {
              form.setError('newEmail', {
                message: errorMessage
              })
            } else if (errorMessage === 'Неверный текущий пароль') {
              form.setError('password', {
                type: 'manual',
                message: errorMessage
              })
            } else {
              toast.error('Произошла ошибка', { description: errorMessage })
            }
          }
        }
      )
    } catch (error) {
      toast.error('Ошибка проверки безопасности')
    }
  }

  if (!user?.password) {
    return (
      <div className='flex flex-col items-center text-center'>
        <OctagonAlert className='text-primary mb-3 size-8' />
        <p>Для изменения настроек безопасности необходимо сначала установить пароль для вашего аккаунта.</p>
      </div>
    )
  }

  return (
    <UserFormWrapper
      heading={user?.email ? 'Изменить адрес почты' : 'Привязка почты'}
      description={
        user?.email
          ? 'Введите новую почту. Мы отправим на нее письмо с подтверждением.'
          : 'Введите почту. Мы отправим на нее письмо с подтверждением.'
      }
    >
      <form id='form-rhf-demo' onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className='group'>
          <Controller
            name='newEmail'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                <Input {...field} type='email' placeholder={user?.email ? 'Новая почта' : 'Почта'} />
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
        <Button variant='secondary' size='lg' type='submit' className='mt-8 w-full'>
          Подтвердить
        </Button>
      </form>
      {CaptchaWidget}
      {isChangeEmailLoading && <Loading />}
    </UserFormWrapper>
  )
}
