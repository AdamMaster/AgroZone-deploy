'use client'

import { useAppModal } from '@/store'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button, Field, FieldError, FieldGroup, Input, Loading } from '@/components/ui'

import { useYandexCaptcha } from '@/shared/hooks/use-yandex-captcha'

import { cn } from '@/lib/utils'

import { useResetPasswordMutation } from '../hooks'
import { ResetPasswordSchema, TypeResetPasswordSchema } from '../schemes'
import { AuthFormWrapper } from './auth-form-wrapper'

export const FormResetPassword = () => {
  const { executeCaptcha, CaptchaWidget } = useYandexCaptcha()
  const { onOpen, setView } = useAppModal()

  const form = useForm<TypeResetPasswordSchema>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      email: ''
    }
  })

  const { reset, isLoadingReset } = useResetPasswordMutation()

  const onSubmit = async (values: TypeResetPasswordSchema) => {
    try {
      const recaptchaToken = await executeCaptcha()

      reset(
        { values, recaptcha: recaptchaToken },
        {
          onSuccess: () => {
            form.reset()
            setView('code-message')
          }
        }
      )
    } catch (error) {
      toast.error('Ошибка проверки безопасности')
    }
  }

  return (
    <AuthFormWrapper
      heading='Сброс пароля'
      description='Введите вашу почту, и мы отправим на неё ссылку для восстановления пароля'
      switchButtonLabel={<>Войти в аккаунт</>}
      onSwitchButtonClick={() => onOpen('login')}
      isShowSocial={false}
    >
      <form id='form-rhf-demo' onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
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
        </FieldGroup>
        <Button variant='secondary' size='lg' type='submit' className='mt-10 w-full'>
          Сбросить
        </Button>
      </form>
      {CaptchaWidget}
      {isLoadingReset && <Loading />}
    </AuthFormWrapper>
  )
}
