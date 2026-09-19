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

import { useSetAdExpirationByAdmin } from '../../ads/hooks'

const PRESET_DAYS = [7, 30, 90]

interface SetAdExpirationDialogProps {
  adId: string
  userId: string
  expiresAt: string | null
  className?: string
}

// Ручная правка срока жизни объявления с карточки пользователя в админке
// (/admin/users/:id) — см. AdsService.setExpirationByAdmin на бэкенде.
// "Снять срок" — объявление больше не истекает само (AdsExpirationWorker
// пропускает expiresAt: null), пока админ не выставит дату обратно.
//
// Важно: если объявление сейчас в статусе EXPIRED, продление даты в
// будущее НЕ возвращает его в PUBLISHED само по себе — по правилам сайта
// истёкшее объявление должно заново пройти модерацию (см. подробный
// комментарий в AdsService.setExpirationByAdmin). Предупреждаем об этом
// прямо в диалоге, чтобы не удивлять админа "я продлил, а оно всё ещё не
// видно на сайте".
export const SetAdExpirationDialog = ({ adId, userId, expiresAt, className }: SetAdExpirationDialogProps) => {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(() => toDateInputValue(expiresAt))
  const { setExpiration, isLoadingSetExpiration } = useSetAdExpirationByAdmin()

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) setDate(toDateInputValue(expiresAt))
  }

  const applyPreset = (days: number) => {
    const base = date && new Date(date) > new Date() ? new Date(date) : new Date()
    base.setDate(base.getDate() + days)
    setDate(toDateInputValue(base))
  }

  const handleSave = () => {
    if (!date) return

    const expiresAtIso = new Date(`${date}T23:59:59`).toISOString()

    setExpiration({ id: adId, userId, expiresAt: expiresAtIso }, { onSuccess: () => setOpen(false) })
  }

  const handleClear = () => {
    setExpiration({ id: adId, userId, expiresAt: null }, { onSuccess: () => setOpen(false) })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button type='button' variant='mist' size='sm' className={cn(className)} />}>
        Срок
      </DialogTrigger>

      <DialogContent className='max-w-100'>
        <DialogHeader>
          <Heading level={3}>Срок жизни объявления</Heading>
          <DialogDescription>
            Если объявление сейчас опубликовано и вы поставите дату в прошлом, оно сразу снимется с публикации.
            Продление даты у уже истёкшего объявления не вернёт его в эфир — оно должно заново пройти модерацию.
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
          <Button
            type='button'
            size='default'
            variant='destructive'
            disabled={isLoadingSetExpiration}
            onClick={handleClear}
          >
            Снять срок
          </Button>
          <Button
            type='button'
            size='default'
            variant='mist'
            disabled={!date || isLoadingSetExpiration}
            onClick={handleSave}
          >
            {isLoadingSetExpiration ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
