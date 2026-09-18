'use client'

import { useState } from 'react'

import {
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
  Heading
} from '@/components/ui'

import { toDateInputValue } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { useSetPremiumByAdmin } from '../hooks'

const PRESET_DAYS = [7, 30, 90]

interface SetPremiumDialogProps {
  userId: string
  premiumUntil: string | null
  className?: string
}

// Ручная выдача/продление/снятие premium с карточки пользователя в админке
// (/admin/users/:id) — см. UserService.setPremiumByAdmin на бэкенде. В
// отличие от обычной покупки (PremiumService — всегда продлевает СВЕРХ
// текущей даты), тут админ задаёт итоговую дату напрямую: пресеты
// (+7/+30/+90) просто удобно подставляют дату в то же поле, а не считают
// что-то отдельно от него — "Сохранить" всегда отправляет именно то, что
// сейчас показано в инпуте.
export const SetPremiumDialog = ({ userId, premiumUntil, className }: SetPremiumDialogProps) => {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(() => toDateInputValue(premiumUntil))
  const { setPremium, isLoadingSetPremium } = useSetPremiumByAdmin(userId)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    // Каждое открытие — заново от актуального значения с сервера, а не от
    // того, что админ мог оставить в поле и закрыть без сохранения в
    // прошлый раз.
    if (nextOpen) setDate(toDateInputValue(premiumUntil))
  }

  const applyPreset = (days: number) => {
    // Пресет добавляет дни к уже выбранной в форме дате, если она в
    // будущем (продлить активный/только что выбранный период), иначе — от
    // сегодня (выдать заново).
    const base = date && new Date(date) > new Date() ? new Date(date) : new Date()
    base.setDate(base.getDate() + days)
    setDate(toDateInputValue(base))
  }

  const handleSave = () => {
    if (!date) return

    // Конец выбранного дня, а не полночь — "premium до 31 декабря" должно
    // означать "весь день 31 декабря ещё активен", а не истекать в его
    // первую секунду.
    const premiumUntilIso = new Date(`${date}T23:59:59`).toISOString()

    setPremium(premiumUntilIso, { onSuccess: () => setOpen(false) })
  }

  const handleRevoke = () => {
    setPremium(null, { onSuccess: () => setOpen(false) })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type='button' variant='dark' size='sm' className={cn(className)} />}>
        Изменить
      </DialogTrigger>

      <DialogContent className='max-w-100'>
        <DialogHeader>
          <Heading level={3}>Premium</Heading>
          <DialogDescription>
            Задайте дату, до которой действует premium. Все опубликованные объявления пользователя сразу поднимутся
            наверх, если после сохранения premium активен.
          </DialogDescription>
        </DialogHeader>

        <div className='mb-4 flex flex-col gap-2'>
          <DatePicker
            value={date}
            onChange={setDate}
            className='rounded-sm border-none bg-gray-100 hover:bg-gray-200'
          />

          <div className='flex gap-1'>
            {PRESET_DAYS.map(days => (
              <Button
                key={days}
                type='button'
                variant='ghost'
                size='sm'
                className={cn('flex-1')}
                onClick={() => applyPreset(days)}
              >
                +{days} дней
              </Button>
            ))}
          </div>
        </div>

        <div className='flex gap-1'>
          <Button type='button' size='sm' variant='destructive' disabled={isLoadingSetPremium} onClick={handleRevoke}>
            Снять premium
          </Button>
          <Button type='button' size='sm' variant='dark' disabled={!date || isLoadingSetPremium} onClick={handleSave}>
            {isLoadingSetPremium ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
