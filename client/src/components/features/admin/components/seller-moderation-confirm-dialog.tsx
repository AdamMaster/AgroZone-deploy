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

import { ADMIN_BUTTON_CLASS } from '../constants/admin-ui.constants'

interface SellerModerationConfirmDialogProps {
  triggerLabel: string
  title: string
  description: string
  confirmLabel: string
  isPending: boolean
  onConfirm: () => void
}

// Подтверждение необратимых для продавца мер (приостановка объявлений, откат
// отзывов). Закрывается сразу после подтверждения: результат модератор видит
// в обновлённой карточке и в уведомлении.
export const SellerModerationConfirmDialog = ({
  triggerLabel,
  title,
  description,
  confirmLabel,
  isPending,
  onConfirm
}: SellerModerationConfirmDialogProps) => {
  const [open, setOpen] = useState(false)

  const handleConfirm = () => {
    onConfirm()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type='button' size='sm' className={ADMIN_BUTTON_CLASS} disabled={isPending} />}>
        {triggerLabel}
      </DialogTrigger>

      <DialogContent className='max-w-100'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button type='button' variant='destructive' disabled={isPending} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
