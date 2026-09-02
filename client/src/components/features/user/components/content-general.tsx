'use client'

import { useAppModal } from '@/store'
import { zodResolver } from '@hookform/resolvers/zod'
import { CameraIcon } from 'lucide-react'
import { ChangeEvent, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import { UserType } from '@/components/features/auth/types'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Field,
  FieldButton,
  FieldDescription,
  FieldError,
  FieldGroup,
  Heading,
  Input,
  Label,
  Loading,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Switch
} from '@/components/ui'

import { USER_TYPE_LABELS, USER_TYPE_OPTIONS } from '@/shared/constants/user-types'
import { useProfile } from '@/shared/hooks'
import { formatPhoneNumber, getPrimaryPhone } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { useUpdateAvatarMutation, useVerifyBusinessMutation } from '../hooks'
import { useUpdateProfileMutation } from '../hooks/use-update-profile-mutation'
import { SettingsSchema, TypeSettingsSchema } from '../schemes'
import { UserAvatar } from './user-avatar'

export const ContentGeneral = () => {
  const { user, isLoading } = useProfile()
  const { onOpen } = useAppModal()

  const form = useForm<TypeSettingsSchema>({
    resolver: zodResolver(SettingsSchema),
    values: {
      name: user?.displayName || '',
      // INDIVIDUAL — тот же дефолт, что и в схеме БД (@default(INDIVIDUAL)),
      // используется, только пока профиль ещё не загрузился.
      type: user?.type || UserType.Individual
    }
  })

  const { update, isLoadingUpdate } = useUpdateProfileMutation()
  const { updateAvatar, isLoadingUpdateAvatar } = useUpdateAvatarMutation()
  const { verifyBusiness, isLoadingVerifyBusiness } = useVerifyBusinessMutation()

  // Выбранный в форме тип — не user?.type: до нажатия "Сохранить" это
  // просто локальный черновик формы (см. Controller name='type' ниже),
  // ИНН-поле должно появляться сразу при выборе "ИП"/"Компания", ещё до
  // сохранения.
  const selectedType = form.watch('type')
  const [inn, setInn] = useState('')

  // Подставляем уже подтверждённый ИНН при загрузке профиля (и при любом
  // его обновлении, например сразу после успешного verifyBusiness) — без
  // этого поле оставалось пустым после обновления страницы, хотя ИНН уже
  // сохранён в базе (user.businessInn), и была видна только строка
  // "Подтверждено: ..." под полем, а не сам ИНН.
  useEffect(() => {
    if (user?.businessInn) {
      setInn(user.businessInn)
    }
  }, [user?.businessInn])

  const onSubmit = (values: TypeSettingsSchema) => {
    update(values)
  }

  const onVerifyBusiness = () => {
    if (!inn.trim()) return
    // expectedType — то, что сейчас выбрано в форме, а не user?.type: нужно
    // хуку, чтобы сравнить с тем, что реально найдёт DaData, и явно
    // предупредить, если они разошлись (см. useVerifyBusinessMutation).
    verifyBusiness({ inn: inn.trim(), expectedType: selectedType })
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      updateAvatar(file)
    }
  }

  return (
    <div className='relative'>
      <Heading level={2} className='mb-6'>
        Личные данные
      </Heading>
      <div className='mb-6 flex flex-row items-center justify-between'>
        {isLoading ? (
          <>
            <Skeleton className='size-18 rounded-full'></Skeleton>
          </>
        ) : (
          user && (
            <div className='group relative overflow-hidden rounded-full'>
              <label
                htmlFor='avatar-upload'
                className={cn(
                  'relative block cursor-pointer',
                  isLoadingUpdateAvatar && 'pointer-events-none opacity-50'
                )}
              >
                <UserAvatar user={user} className='size-15 sm:size-18' />

                <div className='absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-all duration-200 group-hover:opacity-100'>
                  <CameraIcon className='size-6 text-white' />
                </div>

                {isLoadingUpdateAvatar && <Loading className='bg-white/80' />}
              </label>

              <input
                id='avatar-upload'
                type='file'
                accept='image/*'
                className='hidden'
                onChange={onFileChange}
                disabled={isLoadingUpdateAvatar}
              />
            </div>
          )
        )}
      </div>
      <div className='relative'>
        <form id='form-rhf-demo' onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup className='flex flex-col gap-6'>
            <div className='mb-4 flex flex-col gap-6'>
              <div className='flex flex-col items-end gap-x-3 gap-y-6 sm:flex-row'>
                <Controller
                  name='name'
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className={cn('group')}>
                      <Label className='mb-1'>Имя</Label>
                      {isLoading ? (
                        <Skeleton className='rounded-1 h-11 w-full sm:h-12' />
                      ) : (
                        <Input {...field} type='name' placeholder='Имя' />
                      )}
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} className='absolute -bottom-5 left-0' />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name='type'
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} isInvalid={fieldState.invalid}>
                      <Label className='mb-1'>Тип продавца</Label>
                      {isLoading ? (
                        <Skeleton className='rounded-1 h-11 w-full sm:h-12' />
                      ) : (
                        <Select items={USER_TYPE_LABELS} value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className='w-full px-4'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent alignItemWithTrigger={false} align='start'>
                            {USER_TYPE_OPTIONS.map(option => (
                              <SelectItem key={option.value} value={option.value} className='rounded-none px-4'>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
              {selectedType !== UserType.Individual && (
                <Field>
                  <Label className='mb-0'>ИНН</Label>
                  <FieldDescription>
                    Подтвердите {selectedType === UserType.Business ? 'компанию ' : 'ИП '} по ИНН — данные проверяются
                    через сервис DaData. Подтверждённое название будет показано на ваших объявлениях.
                  </FieldDescription>
                  {isLoading ? (
                    <Skeleton className='rounded-1 h-11 w-full sm:h-12' />
                  ) : (
                    <div className='relative'>
                      <Input
                        value={inn}
                        onChange={e => setInn(e.target.value.replace(/\D/g, '').slice(0, 12))}
                        placeholder='ИНН'
                        disabled={isLoadingVerifyBusiness}
                      />
                      <FieldButton onClick={onVerifyBusiness} disabled={isLoadingVerifyBusiness || !inn.trim()}>
                        Подтвердить
                      </FieldButton>
                    </div>
                  )}
                  {user?.businessVerifiedAt && (
                    <p className='text-primary text-xs'>Подтверждено: {user.businessName}</p>
                  )}
                </Field>
              )}
              <Button variant='secondary' size='lg' type='submit' className='h-11 w-fit sm:h-12'>
                Сохранить
              </Button>
            </div>

            <Field>
              <Label className='mb-1'>Почта</Label>
              {isLoading ? (
                <Skeleton className='rounded-1 h-11 w-full sm:h-12' />
              ) : (
                <div className='relative'>
                  <Input type='email' value={user?.email || ''} placeholder='Почта' readOnly />

                  <FieldButton onClick={() => onOpen('change-email')}>
                    {user?.email ? 'Изменить' : 'Добавить почту'}
                  </FieldButton>
                </div>
              )}
            </Field>
            <Field>
              <Label className='mb-1'>Номер телефона</Label>

              {isLoading ? (
                <Skeleton className='rounded-1 h-11 w-full sm:h-12' />
              ) : (
                <div className='relative'>
                  <Input
                    type='tel'
                    value={formatPhoneNumber(user?.primaryPhone || '')}
                    placeholder='Номер телефона'
                    readOnly
                  />

                  <FieldButton onClick={() => onOpen('add-phone', { phones: user?.phones ?? [], mode: 'profile' })}>
                    {user?.primaryPhone ? 'Изменить' : 'Добавить телефон'}
                  </FieldButton>
                </div>
              )}
            </Field>
          </FieldGroup>
        </form>
        {isLoadingUpdate && <Loading />}
      </div>
    </div>
  )
}
