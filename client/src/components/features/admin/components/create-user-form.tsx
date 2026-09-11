'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Copy, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { Button, Field, FieldError, FieldGroup, Heading, Input, InputGroup } from '@/components/ui'

import { formatPhoneNumber } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { useCreateVerifiedUser } from '../hooks'
import { AdminCreateUserSchema, TypeAdminCreateUserSchema } from '../schemes'

// Стили кнопок в админке — единый паттерн из moderation-queue.tsx/
// dealer-feeds-queue.tsx: светлая кнопка на тёмном фоне вместо стандартных
// вариантов Button (которые рассчитаны на светлую тему).
const ADMIN_BUTTON_CLASS = 'rounded-sm bg-neutral-100 text-neutral-950 hover:bg-neutral-200'

// Случайный пароль по умолчанию, чтобы администратору не пришлось
// придумывать его самому под каждого продавца — можно стереть и ввести
// свой руками. Буквы в обоих регистрах + цифры, без визуально похожих
// символов (0/O, 1/l/I) — чтобы легко было продиктовать или переписать на
// бумаге. Длина 10 — с запасом выше минимума в 6 (см. AdminCreateUserSchema).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
const generatePassword = () =>
  Array.from({ length: 10 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')

// Форма создания продавцу аккаунта вручную, минуя звонок для подтверждения
// телефона (см. UserService.createVerifiedByAdmin на сервере). Раньше это
// делалось только из терминала (server/scripts/create-verified-user.ts —
// команда осталась в репозитории на случай, если админка почему-то
// недоступна), пользователь попросил перенести в /admin.
export const CreateUserForm = () => {
  const [copiedField, setCopiedField] = useState<'phone' | 'password' | null>(null)
  const { createVerifiedUser, isCreatingVerifiedUser, createdUser, resetCreatedUser } = useCreateVerifiedUser()

  const form = useForm<TypeAdminCreateUserSchema>({
    resolver: zodResolver(AdminCreateUserSchema),
    defaultValues: { phone: '', password: generatePassword(), displayName: '' }
  })

  const onSubmit = (data: TypeAdminCreateUserSchema) => {
    // Телефон на сервер уходит очищенным от маски — так же, как в обычной
    // регистрации (см. onFormPhoneSubmit в FormRegisterSms).
    const cleanPhone = data.phone.replace(/\D/g, '')

    createVerifiedUser({
      phone: cleanPhone,
      password: data.password,
      ...(data.displayName?.trim() && { displayName: data.displayName.trim() })
    })
  }

  const handleCopy = async (value: string, field: 'phone' | 'password') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    } catch {
      // Буфер обмена недоступен (например, без HTTPS или в старом
      // браузере) — просто не показываем галочку, значения и так видны на
      // экране для ручного копирования.
    }
  }

  const handleCreateAnother = () => {
    resetCreatedUser()
    form.reset({ phone: '', password: generatePassword(), displayName: '' })
  }

  const submittedPassword = form.getValues('password')

  const fieldClassName =
    'bg-neutral-700 border-none hover:bg-neutral-600 focus-visible:bg-neutral-600 placeholder:text-neutral-400 rounded-sm'

  if (createdUser) {
    return (
      <div className='max-w-md py-6 text-neutral-50'>
        <Heading level={3} className='mb-1 font-medium'>
          Аккаунт создан
        </Heading>
        <p className='mb-6 text-sm text-neutral-300'>
          Передайте продавцу эти данные — он сможет войти по телефону и паролю сразу, звонок для подтверждения не
          понадобится.
        </p>

        <div className='flex flex-col gap-3'>
          <div className='flex items-center justify-between gap-3 bg-neutral-600/50 p-3'>
            <div className='min-w-0'>
              <p className='text-xs text-neutral-300'>Телефон</p>
              <p className='truncate text-lg font-semibold'>{formatPhoneNumber(createdUser.phone)}</p>
            </div>
            <Button
              type='button'
              size='sm'
              className={cn(ADMIN_BUTTON_CLASS, 'shrink-0')}
              onClick={() => handleCopy(createdUser.phone, 'phone')}
            >
              {copiedField === 'phone' ? <Check className='size-4' /> : <Copy className='size-4' />}
            </Button>
          </div>

          <div className='flex items-center justify-between gap-3 bg-neutral-600/50 p-3'>
            <div className='min-w-0'>
              <p className='text-xs text-neutral-300'>Пароль</p>
              <p className='truncate text-lg font-semibold'>{submittedPassword}</p>
            </div>
            <Button
              type='button'
              size='sm'
              className={cn(ADMIN_BUTTON_CLASS, 'shrink-0')}
              onClick={() => handleCopy(submittedPassword, 'password')}
            >
              {copiedField === 'password' ? <Check className='size-4' /> : <Copy className='size-4' />}
            </Button>
          </div>
        </div>

        <Button type='button' size='lg' className={cn(ADMIN_BUTTON_CLASS, 'mt-6 px-5')} onClick={handleCreateAnother}>
          Создать ещё один аккаунт
        </Button>
      </div>
    )
  }

  return (
    <div className='max-w-md py-6 text-neutral-50'>
      <Heading level={3} className='mb-1 font-medium text-neutral-100'>
        Новый аккаунт продавца
      </Heading>
      <p className='mb-6 text-sm text-neutral-300'>
        Аккаунт сразу считается подтверждённым — продавец сможет войти по телефону и паролю без звонка. Согласие на
        обработку персональных данных администратор должен получить у продавца отдельно, вне приложения.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Controller
            name='phone'
            control={form.control}
            render={({ field: { onChange, value, ...field }, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                <Input
                  {...field}
                  value={value}
                  type='tel'
                  placeholder='+7 (999) 999-99-99'
                  maxLength={18}
                  onChange={e => onChange(formatPhoneNumber(e.target.value))}
                  className={fieldClassName}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='displayName'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                <Input {...field} placeholder='Имя продавца (необязательно)' className={fieldClassName} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='password'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                {/* Пароль виден открытым текстом, а не под type='password' —
                администратор должен его прочитать и передать продавцу, а не
                просто ввести и забыть, как в обычной форме регистрации. */}
                <InputGroup className='relative'>
                  <Input {...field} type='text' placeholder='Пароль' className={fieldClassName} />
                  <Button
                    type='button'
                    size='sm'
                    className={cn(ADMIN_BUTTON_CLASS, 'absolute top-[50%] right-1.75 w-fit translate-y-[-50%]')}
                    onClick={() => form.setValue('password', generatePassword(), { shouldValidate: true })}
                  >
                    <RefreshCw className='size-4' />
                    Сгенерировать пароль
                  </Button>
                </InputGroup>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <Button type='submit' size='lg' className={cn(ADMIN_BUTTON_CLASS, 'mt-6')} disabled={isCreatingVerifiedUser}>
          {isCreatingVerifiedUser ? 'Создаём...' : 'Создать аккаунт'}
        </Button>
      </form>
    </div>
  )
}
