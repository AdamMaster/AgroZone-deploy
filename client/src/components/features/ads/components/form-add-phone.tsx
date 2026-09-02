'use client'

import { useAppModal } from '@/store'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'

import {
  Button,
  Field,
  FieldError,
  Input,
  Loading,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui'

import { formatPhoneNumber } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { AuthFormWrapper } from '../../auth/components'
import { IUserPhone } from '../../auth/types'
import { useAddPhoneMutation } from '../../user/hooks'
import { AddPhoneSchema, TypeAddPhoneSchema } from '../schemes'

interface FormAddPhoneProps {
  onSuccessComplete?: (phone: string) => void
  phones?: IUserPhone[]
  mode?: 'ad' | 'profile'
}

export const FormAddPhone = ({ onSuccessComplete, phones = [], mode = 'ad' }: FormAddPhoneProps) => {
  const { onClose } = useAppModal()

  const isProfileMode = mode === 'profile'
  const hasExistingPhones = phones.length > 0

  const [step, setStep] = useState(hasExistingPhones ? 0 : 1)
  const [phone, setPhone] = useState('')
  const [callNumber, setCallNumber] = useState('')

  const [selectedPhone, setSelectedPhone] = useState<string | null>(
    phones.find(p => p.isPrimary)?.phone ?? phones[0]?.phone ?? null
  )

  const {
    requestPhone,
    confirmPhone,
    isRequesting,
    isConfirming,
    setPrimaryPhone,
    isSettingPrimary,
    usePhoneCallbackStatus
  } = useAddPhoneMutation()

  const formPhone = useForm<TypeAddPhoneSchema>({
    resolver: zodResolver(AddPhoneSchema),
    defaultValues: {
      phone: ''
    }
  })

  // Опрашиваем, пока не поступит звонок с проверочного номера — только
  // пока действительно показан экран ожидания (step === 2).
  const { data: callbackStatus } = usePhoneCallbackStatus(step === 2)

  useEffect(() => {
    if (step !== 2 || !callbackStatus?.confirmed || !callbackStatus.code) return

    confirmPhone(
      { code: callbackStatus.code, makePrimary: isProfileMode },
      {
        onSuccess: () => {
          onSuccessComplete?.(phone)

          formPhone.reset()

          onClose()
        }
      }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callbackStatus, step])

  const onUseExistingPhone = () => {
    if (!selectedPhone) return

    if (isProfileMode) {
      setPrimaryPhone(selectedPhone, {
        onSuccess: () => {
          onSuccessComplete?.(selectedPhone)
          onClose()
        }
      })
      return
    }

    onSuccessComplete?.(selectedPhone)
    onClose()
  }

  const onPhoneSubmit = (data: TypeAddPhoneSchema) => {
    const cleanPhone = data.phone.replace(/\D/g, '')

    requestPhone(cleanPhone, {
      onSuccess: response => {
        setPhone(cleanPhone)
        setCallNumber(response.callNumber)
        setStep(2)
      }
    })
  }

  const heading = isProfileMode ? 'Изменить номер' : step === 0 ? 'Номер для связи' : 'Добавление номера'
  const description =
    step === 0
      ? 'Выберите один из привязанных номеров или укажите новый'
      : step === 1
        ? 'Укажите номер телефона для связи'
        : 'Позвоните для подтверждения'

  const isBusy = isRequesting || isConfirming || isSettingPrimary

  return (
    <AuthFormWrapper
      className='mx-auto w-full max-w-md text-left'
      heading={heading}
      isShowSocial={false}
      description={description}
    >
      {step === 0 && (
        <div className='flex flex-col gap-4'>
          <Select value={selectedPhone} onValueChange={setSelectedPhone}>
            <SelectTrigger className='h-13! w-full px-4'>
              <SelectValue placeholder='Выберите номер'>
                {(value: string | null) => (value ? formatPhoneNumber(value) : 'Выберите номер')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align='start'>
              {phones.map(p => (
                <SelectItem key={p.id} value={p.phone} className='rounded-none px-4'>
                  {formatPhoneNumber(p.phone)}
                  {p.isPrimary ? ' (основной)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant='secondary'
            size='lg'
            type='button'
            className='w-full'
            disabled={!selectedPhone || isBusy}
            onClick={onUseExistingPhone}
          >
            {isProfileMode ? 'Сделать основным' : 'Использовать этот номер'}
          </Button>

          <button
            type='button'
            className='text-muted-foreground self-center text-sm underline'
            onClick={() => setStep(1)}
          >
            Указать другой номер
          </button>
        </div>
      )}

      {step === 1 && (
        <form onSubmit={formPhone.handleSubmit(onPhoneSubmit)}>
          <Controller
            name='phone'
            control={formPhone.control}
            render={({ field: { onChange, value, ...field }, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className={cn(fieldState.invalid && 'pb-5', 'group')}>
                <Input
                  {...field}
                  value={value}
                  type='tel'
                  placeholder='+7 (999) 999-99-99'
                  maxLength={18}
                  onChange={e => {
                    onChange(formatPhoneNumber(e.target.value))
                  }}
                />

                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <div className='mt-6 flex gap-3'>
            {hasExistingPhones && (
              <Button variant='outline' size='lg' type='button' onClick={() => setStep(0)} disabled={isRequesting}>
                Назад
              </Button>
            )}

            <Button variant='secondary' size='lg' type='submit' className='flex-1' disabled={isRequesting}>
              {isRequesting ? 'Отправка...' : 'Продолжить'}
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className='flex flex-col items-center gap-4 text-center'>
          <p className='text-muted-foreground text-sm'>Позвоните с номера {formatPhoneNumber(phone)} на</p>
          <p className='text-2xl font-semibold'>{callNumber}</p>
          <p className='text-muted-foreground text-sm'>
            Звонок бесплатный, трубку можно сразу положить — подтверждение придёт автоматически
          </p>

          <div className='text-muted-foreground mt-2 flex items-center gap-2 text-sm'>
            <Loader2 className='text-primary size-4 animate-spin' />
            Ждём звонка...
          </div>

          <button type='button' className='text-muted-foreground mt-2 text-sm underline' onClick={() => setStep(1)}>
            Указать другой номер
          </button>
        </div>
      )}

      {isBusy && <Loading />}
    </AuthFormWrapper>
  )
}
