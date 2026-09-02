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
import { Textarea } from '@/components/ui/textarea'

import { useRejectAd } from '../../ads/hooks'

interface RejectAdDialogProps {
  adId: string
  className?: string
}

export const RejectAdDialog = ({ adId, className }: RejectAdDialogProps) => {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  const { rejectAd, isLoadingReject } = useRejectAd()

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (!value) setReason('')
  }

  const handleSubmit = () => {
    if (!reason.trim()) return

    rejectAd(
      { id: adId, reason: reason.trim() },
      {
        onSuccess: () => {
          setOpen(false)
          setReason('')
        }
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant='ghost' size='sm' className={className} />}>Отклонить</DialogTrigger>

      <DialogContent className='max-w-100'>
        <DialogHeader>
          <DialogTitle>Отклонить объявление</DialogTitle>
          <DialogDescription>Причина будет показана продавцу — объясните, что нужно исправить.</DialogDescription>
        </DialogHeader>

        <Textarea
          value={reason}
          onChange={event => setReason(event.target.value)}
          placeholder='Например: не соответствует выбранной категории'
          rows={3}
          className='resize-none'
        />

        <DialogFooter>
          <Button
            type='button'
            variant='destructive'
            disabled={!reason.trim() || isLoadingReject}
            onClick={handleSubmit}
          >
            Отклонить объявление
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
