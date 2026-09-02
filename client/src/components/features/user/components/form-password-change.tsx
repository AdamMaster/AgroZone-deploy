'use client'

import { useAppModal } from '@/store'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button, Field, FieldError, FieldGroup, Input, InputGroup, Loading, PasswordToggle } from '@/components/ui'

import { useProfile } from '@/shared/hooks'

import { cn } from '@/lib/utils'

import { usePasswordChangeMutation } from '../hooks'
import { PasswordChangeSchema, TypePasswordChangeSchema } from '../schemes'
import { UserFormWrapper } from './user-form-wrapper'

export const FormPasswordChange = () => {
  const { user, isLoading } = useProfile()
  const isOAuthOnly = user?.password === null
  const [showPassword, setShowPassword] = useState(false)
  const { setView } = useAppModal()

  const form = useForm<TypePasswordChangeSchema>({
    resolver: zodResolver(PasswordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  const { updatePassword, isUpdatePasswordLoading } = usePasswordChangeMutation()

  const onSubmit = (values: TypePasswordChangeSchema) => {
    updatePassword(values, {
      onSuccess: () => {
        setView('change-password-confirm')
      },
      onError: error => {
        const errorMessage = error.message

        if (errorMessage === 'Необходимо указать текущий пароль') {
          form.setError('currentPassword', {
            message: errorMessage
          })
        } else if (errorMessage === 'Текущий пароль указан неверно') {
          form.setError('currentPassword', {
            type: 'manual',
            message: errorMessage
          })
        } else {
          toast.error('Произошла ошибка', { description: errorMessage })
        }
      }
    })
  }

  return (
    <UserFormWrapper
      heading={isOAuthOnly ? 'Установить пароль' : 'Изменить пароль'}
      description={
        isOAuthOnly
          ? 'Установите пароль для прямого доступа к аккаунту'
          : 'Для изменения пароля заполните все поля ниже'
      }
    >
      <form id='form-rhf-demo' onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className={cn('group')}>
          {!isOAuthOnly && (
            <Controller
              name='currentPassword'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                  <InputGroup>
                    <Input {...field} type={showPassword ? 'text' : 'password'} placeholder='Текущий пароль' />
                    <PasswordToggle isShow={showPassword} onClick={() => setShowPassword(!showPassword)} />
                  </InputGroup>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}
          <Controller
            name='newPassword'
            control={form.control}
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
          <Controller
            name='confirmPassword'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                <InputGroup>
                  <Input {...field} type={showPassword ? 'text' : 'password'} placeholder='Подтвердить новый пароль' />
                  <PasswordToggle isShow={showPassword} onClick={() => setShowPassword(!showPassword)} />
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
      {isUpdatePasswordLoading && <Loading />}
    </UserFormWrapper>
  )
}
