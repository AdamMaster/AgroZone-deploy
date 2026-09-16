'use client'

import { useState } from 'react'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui'

import { cn } from '@/lib/utils'

import { useRemoveAdAdmin } from '../../ads/hooks'

interface DeleteAdAdminDialogProps {
  adId: string
  adTitle: string
  userId: string
  className?: string
}

// Подтверждение удаления объявления с карточки пользователя в админке
// (/admin/users/:id) — тот же паттерн, что и у RejectAdDialog (модерация),
// но без причины: удаление админом необратимо и не требует объяснения
// продавцу (в отличие от отклонения на модерации, где причина показывается
// именно ему).
export const DeleteAdAdminDialog = ({ adId, adTitle, userId, className }: DeleteAdAdminDialogProps) => {
  const [open, setOpen] = useState(false)
  const { removeAdAsAdmin, isLoadingRemove } = useRemoveAdAdmin()

  const handleDelete = () => {
    removeAdAsAdmin(
      { id: adId, userId },
      {
        onSuccess: () => setOpen(false)
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type='button'
            variant='destructive'
            size='sm'
            className={cn(className, 'rounded-sm bg-red-400 text-neutral-950 hover:bg-red-400')}
          />
        }
      >
        Удалить
      </DialogTrigger>

      <DialogContent className='max-w-100'>
        <DialogHeader>
          <DialogTitle>Удалить объявление?</DialogTitle>
          <DialogDescription>
            «{adTitle}» будет удалено безвозвратно вместе с фотографиями. Действие нельзя отменить.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type='button' variant='destructive' disabled={isLoadingRemove} onClick={handleDelete}>
            {isLoadingRemove ? 'Удаляем...' : 'Удалить объявление'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
