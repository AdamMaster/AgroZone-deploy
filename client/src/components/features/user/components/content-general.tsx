'use client'

import { useAppModal } from '@/store'
import { zodResolver } from '@hookform/resolvers/zod'
import { CameraIcon, FileText, X } from 'lucide-react'
import { ChangeEvent, useEffect, useRef, useState } from 'react'
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
import { formatFileSize, formatPhoneNumber, getPrimaryPhone } from '@/shared/utils'

import { cn } from '@/lib/utils'

import {
  useRemovePresentationMutation,
  useUpdateAvatarMutation,
  useUpdatePresentationMutation,
  useVerifyBusinessMutation
} from '../hooks'
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

  const { updatePresentation, isLoadingUpdatePresentation } = useUpdatePresentationMutation()
  const { removePresentation, isLoadingRemovePresentation } = useRemovePresentationMutation()
  const presentationInputRef = useRef<HTMLInputElement>(null)
  const isLoadingPresentation = isLoadingUpdatePresentation || isLoadingRemovePresentation

  const onPresentationFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      updatePresentation(file)
    }
    // Иначе повторный выбор того же файла (например, сразу после неудачной
    // загрузки — исправили и выбрали снова) не вызовет onChange: браузер
    // не считает это изменением value инпута.
    if (presentationInputRef.current) presentationInputRef.current.value = ''
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
                      <Label className='mb-1!'>Имя</Label>
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
                      <Label className='mb-1!'>Тип продавца</Label>
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
                  <Label className='mb-0!'>ИНН</Label>
                  <FieldDescription className='mb-1'>
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
              <Label className='mb-1!'>Почта</Label>
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
              <Label className='mb-1!'>Номер телефона</Label>

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

            <Field>
              <Label className='mb-0!'>Презентация компании</Label>
              <FieldDescription className='mb-1'>
                Прайс-лист, каталог или файл о вашей компании — покажем его в вашем публичном профиле, всем посетителям
                сайта. Форматы: PDF, DOCX, XLSX, PPTX, до 15 МБ.
              </FieldDescription>

              {isLoading ? (
                <Skeleton className='rounded-1 h-11 w-full sm:h-12' />
              ) : user?.presentationUrl ? (
                <div className='relative flex items-center gap-3 rounded-lg border p-3'>
                  <FileText className='text-gray-400' size={20} />
                  <div className='min-w-0 flex-1'>
                    <a
                      href={user.presentationUrl}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='block truncate text-sm font-medium hover:underline'
                    >
                      {user.presentationFileName ?? 'Презентация'}
                    </a>
                    {typeof user.presentationFileSize === 'number' && (
                      <p className='text-xs text-gray-500'>{formatFileSize(user.presentationFileSize)}</p>
                    )}
                  </div>
                  <button
                    type='button'
                    onClick={() => presentationInputRef.current?.click()}
                    disabled={isLoadingPresentation}
                    className='shrink-0 text-sm text-gray-500 hover:text-gray-900 hover:underline disabled:opacity-50'
                  >
                    Заменить
                  </button>
                  <button
                    type='button'
                    aria-label='Удалить презентацию'
                    onClick={() => removePresentation()}
                    disabled={isLoadingPresentation}
                    className='shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50'
                  >
                    <X size={16} />
                  </button>
                  {isLoadingPresentation && <Loading />}
                </div>
              ) : (
                <div className='relative'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => presentationInputRef.current?.click()}
                    disabled={isLoadingPresentation}
                  >
                    {isLoadingPresentation ? 'Загружаем...' : 'Загрузить файл'}
                  </Button>
                </div>
              )}

              <input
                ref={presentationInputRef}
                type='file'
                accept='.pdf,.docx,.xlsx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation'
                className='hidden'
                onChange={onPresentationFileChange}
                disabled={isLoadingPresentation}
              />
            </Field>
          </FieldGroup>
        </form>
        {isLoadingUpdate && <Loading />}
      </div>
    </div>
  )
}
