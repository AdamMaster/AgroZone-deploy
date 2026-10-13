'use client'

import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui'

import { formatPhoneNumber } from '@/shared/utils'

interface CallConfirmationStepProps {
  phone: string
  callNumber: string
  // Ошибка опроса (например, время ожидания звонка истекло): ожидание
  // заканчивается, вместо него — предложение запросить звонок заново.
  error?: string
  onChangePhone: () => void
}

// Шаг «позвоните на проверочный номер» — общий для регистрации и сброса
// пароля по звонку. Подтверждение приходит автоматически: опрос статуса
// делает форма, которая показывает этот шаг.
export const CallConfirmationStep = ({ phone, callNumber, error, onChangePhone }: CallConfirmationStepProps) => (
  <div className='flex flex-col items-center gap-4 text-center'>
    <p className='text-sm text-gray-500'>Позвоните с номера {formatPhoneNumber(phone)} на</p>
    {/* tel: — на мобильных открывает штатный набор номера, чтобы не
    заставлять пользователя перепечатывать номер руками (он и так
    должен позвонить именно с этого телефона, иначе провайдер не
    опознает звонок — см. checkCallbackConfirmed). Пробелы/скобки/
    дефисы из отображаемого номера в href не годятся — некоторые
    мобильные браузеры их не разбирают, поэтому чистим до
    цифр+плюса отдельно от того, что показываем на экране. */}
    <a href={`tel:${callNumber.replace(/[^\d+]/g, '')}`} className='text-2xl font-semibold'>
      {callNumber}
    </a>
    <p className='text-sm text-gray-500'>
      Звонок бесплатный, трубку можно сразу положить — подтверждение придёт автоматически
    </p>

    {error ? (
      <>
        <p className='text-destructive text-sm'>{error}</p>
        <Button variant='outline' type='button' onClick={onChangePhone}>
          Запросить звонок заново
        </Button>
      </>
    ) : (
      <div className='mt-2 flex items-center gap-2 text-sm text-gray-400'>
        <Loader2 className='text-primary size-4 animate-spin' />
        Ждём звонка...
      </div>
    )}

    <button type='button' className='text-muted-foreground mt-2 text-sm underline' onClick={onChangePhone}>
      Указать другой номер
    </button>
  </div>
)
