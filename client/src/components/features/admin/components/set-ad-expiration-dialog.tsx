'use client'

import { useState } from 'react'

import {
  Button,
  DatePicker,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui'

import { toDateInputValue } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { useSetAdExpirationByAdmin } from '../../ads/hooks'
import { ADMIN_BUTTON_CLASS } from '../constants/admin-ui.constants'

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
      <DialogTrigger render={<Button type='button' size='sm' className={cn(ADMIN_BUTTON_CLASS, className)} />}>
        Срок
      </DialogTrigger>

      <DialogContent className='max-w-100'>
        <DialogHeader>
          <DialogTitle>Срок жизни объявления</DialogTitle>
          <DialogDescription>
            Если объявление сейчас опубликовано и вы поставите дату в прошлом, оно сразу снимется с публикации.
            Продление даты у уже истёкшего объявления не вернёт его в эфир — оно должно заново пройти модерацию.
          </DialogDescription>
        </DialogHeader>

        <DatePicker
          value={date}
          onChange={setDate}
          className='rounded-sm border-none bg-neutral-700 hover:bg-neutral-600'
        />

        <div className='flex gap-2'>
          {PRESET_DAYS.map(days => (
            <Button
              key={days}
              type='button'
              size='sm'
              className={cn(ADMIN_BUTTON_CLASS, 'flex-1')}
              onClick={() => applyPreset(days)}
            >
              +{days} дней
            </Button>
          ))}
        </div>

        <DialogFooter className='sm:justify-between'>
          <Button type='button' variant='destructive' disabled={isLoadingSetExpiration} onClick={handleClear}>
            Снять срок
          </Button>
          <Button
            type='button'
            className={ADMIN_BUTTON_CLASS}
            disabled={!date || isLoadingSetExpiration}
            onClick={handleSave}
          >
            {isLoadingSetExpiration ? 'Сохраняем...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
