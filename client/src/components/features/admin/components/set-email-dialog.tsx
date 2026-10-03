'use client'

import { zodResolver } from '@hookform/resolvers/zod'
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
  Input
} from '@/components/ui'

import { cn } from '@/lib/utils'

import { useSetEmailByAdmin } from '../hooks'
import { AdminSetEmailSchema, TypeAdminSetEmailSchema } from '../schemes'

interface SetEmailDialogProps {
  userId: string
  email: string | null
  className?: string
}

const fieldClassName = 'bg-mist-700 border-none hover:bg-mist-600 focus-visible:bg-mist-600 rounded-sm'

// Задать/сменить email с карточки пользователя в админке (/admin/users/:id)
// — см. UserService.setEmailByAdmin на бэкенде. Нужен отдельно от
// самостоятельной смены email пользователем (auth/email-change) — там
// email не у всех есть вообще (вход по телефону), а подтвердить владение
// новым адресом по ссылке из письма сам пользователь без доступа к старому
// каналу не всегда может. Админ меняет напрямую, без этой проверки — под
// свою ответственность, см. текст предупреждения ниже.
export const SetEmailDialog = ({ userId, email, className }: SetEmailDialogProps) => {
  const [open, setOpen] = useState(false)
  const { setEmail, isLoadingSetEmail } = useSetEmailByAdmin(userId)

  const form = useForm<TypeAdminSetEmailSchema>({
    resolver: zodResolver(AdminSetEmailSchema),
    defaultValues: { newEmail: email ?? '' }
  })

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    // Каждое открытие — заново от актуального значения с сервера, а не от
    // того, что могло остаться в форме с прошлого открытия без сохранения.
    if (nextOpen) form.reset({ newEmail: email ?? '' })
  }

  const onSubmit = (data: TypeAdminSetEmailSchema) => {
    setEmail(data.newEmail, { onSuccess: () => setOpen(false) })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type='button' variant='mist' size='sm' className={cn(className)} />}>
        {email ? 'Изменить' : 'Задать email'}
      </DialogTrigger>

      <DialogContent className='max-w-100'>
        <DialogHeader>
          <Heading level={3}>{email ? 'Сменить email' : 'Задать email'}</Heading>
          <DialogDescription>
            {email && (
              <>
                На текущий адрес ({email}) уйдёт уведомление о смене — на случай, если это были не вы. <br />
              </>
            )}
            Подтверждение владения новым адресом не запрашивается — убедитесь, что это точно адрес пользователя.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className='mb-4'>
            <Controller
              name='newEmail'
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                  <Input {...field} type='email' placeholder='email@example.com' />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>

          <Button type='submit' size='lg' variant='mist' disabled={isLoadingSetEmail} className='w-full'>
            {isLoadingSetEmail ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
