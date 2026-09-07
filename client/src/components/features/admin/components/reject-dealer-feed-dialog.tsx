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

import { useRejectDealerFeed } from '../hooks'

interface RejectDealerFeedDialogProps {
  feedId: string
  className?: string
}

export const RejectDealerFeedDialog = ({ feedId, className }: RejectDealerFeedDialogProps) => {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')

  const { rejectDealerFeed, isRejectingDealerFeed } = useRejectDealerFeed()

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (!value) setReason('')
  }

  const handleSubmit = () => {
    if (!reason.trim()) return

    rejectDealerFeed(
      { id: feedId, reason: reason.trim() },
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
          <DialogTitle>Отклонить фид</DialogTitle>
          <DialogDescription>Причина будет показана дилеру — объясните, что нужно исправить.</DialogDescription>
        </DialogHeader>

        <Textarea
          value={reason}
          onChange={event => setReason(event.target.value)}
          placeholder='Например: ссылка недоступна или формат не соответствует требованиям'
          rows={3}
          className='resize-none'
        />

        <DialogFooter>
          <Button
            type='button'
            variant='destructive'
            disabled={!reason.trim() || isRejectingDealerFeed}
            onClick={handleSubmit}
          >
            Отклонить фид
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
