'use client'

import { useAppModal } from '@/store'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button, Field, FieldError, FieldGroup, Input, InputGroup, Loading, PasswordToggle } from '@/components/ui'

import { useYandexCaptcha } from '@/shared/hooks/use-yandex-captcha'

import { isSafeReturnPath } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { useLoginMutation } from '../hooks'
import { LoginSchema, TypeLoginSchema } from '../schemes'
import { AuthFormWrapper } from './auth-form-wrapper'

interface LoginFormProps {
  isShowSocial?: boolean
  // U1 в ROADMAP.md: куда унести пользователя после успешного входа —
  // например, обратно на объявление с сразу открытым диалогом продавцу,
  // или на форму создания объявления. См. shared/utils/return-to.ts —
  // isSafeReturnPath проверяется здесь ещё раз защитным слоем, хотя
  // все места, что кладут returnTo в props модалки, уже либо жёстко
  // прописанный в коде путь, либо сами проверяют перед этим.
  returnTo?: string
}

export const FormLogin = ({ isShowSocial = true, returnTo }: LoginFormProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const [isShowTwoFactor, setIsShowTwoFactor] = useState(false)
  const { onOpen, onClose } = useAppModal()
  const router = useRouter()

  const { executeCaptcha, CaptchaWidget } = useYandexCaptcha()

  const form = useForm<TypeLoginSchema>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      login: '',
      password: '',
      code: ''
    }
  })
  const { login, isLoadingLogin } = useLoginMutation(setIsShowTwoFactor)

  const onSubmit = async (values: TypeLoginSchema) => {
    if (isShowTwoFactor && (!values.code || values.code.trim() === '')) {
      form.setError('code', {
        type: 'manual',
        message: 'Введите код подтверждения'
      })
      return
    }

    try {
      const recaptchaToken = await executeCaptcha()

      login(
        {
          values,
          recaptcha: recaptchaToken
        },
        {
          onSuccess: data => {
            if (!data?.message) {
              onClose()
              form.reset()

              if (isSafeReturnPath(returnTo)) {
                router.push(returnTo)
              }
            }
          }
        }
      )
    } catch (error) {
      toast.error('Ошибка проверки безопасности')
    }
  }

  return (
    <AuthFormWrapper
      heading={!isShowTwoFactor ? 'Вход' : 'Подтверждение'}
      description={
        isShowSocial && !isShowTwoFactor
          ? 'Войти с помощью:'
          : 'Мы отправили одноразовый код подтверждения. Пожалуйста, введите его ниже'
      }
      switchButtonLabel={
        !isShowTwoFactor && (
          <>
            Еще нет аккаунта? <span className='text-primary'>Зарегистрироваться</span>
          </>
        )
      }
      isShowSocial={isShowSocial && !isShowTwoFactor}
      onSwitchButtonClick={() => onOpen('register-sms', returnTo ? { returnTo } : undefined)}
    >
      <form id='form-rhf-demo' onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className={cn('group', !isShowTwoFactor && 'hidden')}>
          <Controller
            name='code'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className='group'>
                <Input {...field} placeholder='Код' value={field.value || ''} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>
        <FieldGroup className={cn('group', isShowTwoFactor && 'hidden')}>
          <Controller
            name='login'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                <Input {...field} type='text' placeholder='Почта или номер телефона' />
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
          <Button
            variant='link'
            className='hover:text-primary inline-block h-auto text-right text-xs text-gray-900 underline'
            onClick={() => onOpen('new-password')}
          >
            Забыли пароль?
          </Button>
        </FieldGroup>
        <Button variant='secondary' size='lg' type='submit' className='mt-4 w-full'>
          Войти
        </Button>
      </form>
      {CaptchaWidget}
      {isLoadingLogin && <Loading />}
    </AuthFormWrapper>
  )
}
