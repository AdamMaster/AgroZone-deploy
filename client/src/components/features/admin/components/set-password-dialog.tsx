'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Copy, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
  Field,
  FieldError,
  FieldGroup,
  Heading,
  Input,
  InputGroup
} from '@/components/ui'

import { generatePassword } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { ADMIN_BUTTON_CLASS } from '../constants/admin-ui.constants'
import { useSetPasswordByAdmin } from '../hooks'
import { AdminSetPasswordSchema, TypeAdminSetPasswordSchema } from '../schemes'

interface SetPasswordDialogProps {
  userId: string
  className?: string
}

const fieldClassName = 'bg-mist-700 border-none hover:bg-mist-600 focus-visible:bg-mist-600 rounded-sm'

// Принудительная смена пароля с карточки пользователя в админке
// (/admin/users/:id) — см. UserService.setPasswordByAdmin на бэкенде.
// Используется, когда пользователь потерял доступ к аккаунту и не может
// сменить пароль обычным путём (знать текущий, см. updatePassword) — это
// НЕ просмотр существующего пароля (см. обсуждение с пользователем: пароли
// хранятся Argon2-хэшем, восстановить их из базы нельзя в принципе), а
// именно выдача нового взамен.
export const SetPasswordDialog = ({ userId, className }: SetPasswordDialogProps) => {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const { setPassword, isLoadingSetPassword } = useSetPasswordByAdmin(userId)

  const form = useForm<TypeAdminSetPasswordSchema>({
    resolver: zodResolver(AdminSetPasswordSchema),
    defaultValues: { newPassword: generatePassword() }
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    // Каждое открытие — новый сгенерированный пароль, а не то, что могло
    // остаться в форме с прошлого открытия (закрытого без сохранения).
    if (nextOpen) {
      form.reset({ newPassword: generatePassword() })
      setCopied(false)
    }
  }

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Буфер обмена недоступен — просто не показываем галочку, пароль и
      // так виден в поле для ручного копирования.
    }
  }

  const onSubmit = (data: TypeAdminSetPasswordSchema) => {
    setPassword(data.newPassword, { onSuccess: () => setOpen(false) })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type='button' variant='mist' size='sm' className={cn(className)} />}>
        Сменить пароль
      </DialogTrigger>

      <DialogContent className='max-w-100'>
        <DialogHeader>
          <Heading level={3}>Сменить пароль</Heading>
          <DialogDescription>
            Пользователь получит email о том, что пароль изменён администратором (без самого пароля — email не
            защищённый канал). Новый пароль передайте пользователю лично или через поддержку.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className='mb-4'>
            <Controller
              name='newPassword'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                  {/* type='text', не 'password' — администратор должен прочитать
                  и передать пароль пользователю, а не просто ввести и забыть. */}
                  <InputGroup className='relative'>
                    <Input {...field} type='text' placeholder='Новый пароль' />
                    <div className='absolute top-[50%] right-1.75 flex translate-y-[-50%] gap-1'>
                      <Button
                        type='button'
                        size='sm'
                        className={cn(ADMIN_BUTTON_CLASS, 'w-fit')}
                        onClick={() => handleCopy(field.value)}
                      >
                        {copied ? <Check className='size-4' /> : <Copy className='size-4' />}
                      </Button>
                      <Button
                        type='button'
                        size='sm'
                        className={cn(ADMIN_BUTTON_CLASS, 'w-fit')}
                        onClick={() => form.setValue('newPassword', generatePassword(), { shouldValidate: true })}
                      >
                        <RefreshCw className='size-4' />
                      </Button>
                    </div>
                  </InputGroup>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <Button type='submit' size='lg' variant='dark' disabled={isLoadingSetPassword} className='w-full'>
            {isLoadingSetPassword ? 'Сохраняем...' : 'Сохранить новый пароль'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
