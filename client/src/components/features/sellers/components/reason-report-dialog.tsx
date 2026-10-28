'use client'

import { useState } from 'react'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  Heading,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui'
import { Textarea } from '@/components/ui/textarea'

interface ReasonReportDialogProps<T extends string> {
  title: string
  description: string
  options: readonly { value: T; label: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
  isPending: boolean
  commentMaxLength: number
  // onSuccess закрывает окно: вызывающий передаёт его в mutate, чтобы окно не
  // закрылось, если сервер отклонил жалобу (например, нет контакта с продавцом).
  onSubmit: (values: { reason: T; comment?: string }, onSuccess: () => void) => void
}

// Окно «причина + комментарий» для жалоб на отзыв и на продавца (по образцу
// ReportAdDialog для объявлений). Управляется снаружи: у каждой жалобы свой
// триггер.
export function ReasonReportDialog<T extends string>({
  title,
  description,
  options,
  open,
  onOpenChange,
  isPending,
  commentMaxLength,
  onSubmit
}: ReasonReportDialogProps<T>) {
  const [reason, setReason] = useState<T | null>(null)
  const [comment, setComment] = useState('')

  const handleOpenChange = (value: boolean) => {
    onOpenChange(value)

    if (!value) {
      setReason(null)
      setComment('')
    }
  }

  const handleSubmit = () => {
    if (!reason) return

    onSubmit({ reason, comment: comment.trim() || undefined }, () => handleOpenChange(false))
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-w-100 p-7'>
        <DialogHeader>
          <Heading level={4}>{title}</Heading>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-4'>
          <div>
            <Label>Причина</Label>
            <Select value={reason ?? undefined} onValueChange={(value: string | null) => setReason(value as T)}>
              <SelectTrigger className='w-full px-4'>
                <SelectValue placeholder='Выберите причину'>
                  {(value: string | null) => options.find(item => item.value === value)?.label ?? 'Выберите причину'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {options.map(option => (
                  <SelectItem key={option.value} value={option.value} className='rounded-none px-4'>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Комментарий (необязательно)</Label>
            <Textarea
              value={comment}
              onChange={event => setComment(event.target.value)}
              placeholder='Дополнительные детали...'
              rows={3}
              maxLength={commentMaxLength}
              className='resize-none'
            />
          </div>
        </div>

        <Button size='lg' variant='secondary' type='button' disabled={!reason || isPending} onClick={handleSubmit}>
          Отправить жалобу
        </Button>
      </DialogContent>
    </Dialog>
  )
}
