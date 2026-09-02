'use client'

import { useAppModal } from '@/store'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { Button, Field, FieldError, FieldGroup, Input, InputGroup, Loading, PasswordToggle } from '@/components/ui'

import { useProfile } from '@/shared/hooks'

import { cn } from '@/lib/utils'

import { useDeleteAccountMutation } from '../hooks'
import { DeleteAccountSchema, TypeDeleteAccountSchema } from '../schemes'
import { UserFormWrapper } from './user-form-wrapper'

export const FormDeleteAccount = () => {
  const { user } = useProfile()
  const isOAuthOnly = !user?.password
  const [showPassword, setShowPassword] = useState(false)
  const { onClose } = useAppModal()

  const form = useForm<TypeDeleteAccountSchema>({
    resolver: zodResolver(DeleteAccountSchema),
    defaultValues: {
      password: ''
    }
  })

  const { deleteAccount, isDeleteAccountLoading } = useDeleteAccountMutation()

  const onSubmit = (values: TypeDeleteAccountSchema) => {
    deleteAccount(values, {
      onSuccess: () => {
        onClose()
      },
      onError: error => {
        const errorMessage = error.message

        if (errorMessage === 'Неверный пароль') {
          form.setError('password', { type: 'manual', message: errorMessage })
        } else {
          toast.error('Не удалось удалить аккаунт', { description: errorMessage })
        }
      }
    })
  }

  return (
    <UserFormWrapper heading='Удаление аккаунта' description='Это действие необратимо'>
      <p className='mb-6 text-left text-sm text-gray-500'>
        Аккаунт будет удалён без возможности восстановления. Ваши объявления пропадут из каталога и будут удалены через
        30 дней. Переписки останутся у собеседников, но будут отображаться от лица удалённого пользователя.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          {!isOAuthOnly && (
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
          )}
        </FieldGroup>

        <div className='mt-8 flex gap-2'>
          <Button type='button' variant='outline' size='lg' className='grow' onClick={onClose}>
            Отмена
          </Button>
          <Button type='submit' variant='destructive' size='lg' className='grow'>
            Удалить аккаунт
          </Button>
        </div>
      </form>
      {isDeleteAccountLoading && <Loading />}
    </UserFormWrapper>
  )
}
