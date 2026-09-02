'use client'

import { Flag } from 'lucide-react'
import { useState } from 'react'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Heading,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui'
import { Textarea } from '@/components/ui/textarea'

import { AD_REPORT_REASON_OPTIONS } from '@/shared/constants/ad-report-reasons'

import { useReportAd } from '../hooks'
import { AdReportReason } from '../types/ad.types'

interface ReportAdDialogProps {
  adId: string
  // Контролируемый режим — без своего триггера (см. ad-detail.tsx: пункт
  // "Пожаловаться" в мобильном дропдауне "..." открывает этот же диалог
  // снаружи, вместо второго независимого триггера рядом с обычной
  // текстовой ссылкой внизу страницы). Без этих пропсов компонент работает
  // как раньше — сам управляет своим open и рисует собственный триггер.
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const ReportAdDialog = ({ adId, open: controlledOpen, onOpenChange }: ReportAdDialogProps) => {
  const isControlled = controlledOpen !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const open = isControlled ? controlledOpen : internalOpen
  const [reason, setReason] = useState<AdReportReason | null>(null)
  const [comment, setComment] = useState('')

  const { reportAd, isReporting } = useReportAd()

  const resetForm = () => {
    setReason(null)
    setComment('')
  }

  const handleOpenChange = (value: boolean) => {
    if (isControlled) {
      onOpenChange?.(value)
    } else {
      setInternalOpen(value)
    }
    if (!value) resetForm()
  }

  const handleSubmit = () => {
    if (!reason) return

    reportAd(
      { id: adId, dto: { reason, comment: comment.trim() || undefined } },
      {
        onSuccess: () => {
          handleOpenChange(false)
        }
      }
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && (
        <DialogTrigger className='flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700'>
          <Flag className='size-4' />
          Пожаловаться
        </DialogTrigger>
      )}

      <DialogContent className='max-w-100 p-7'>
        <DialogHeader>
          <Heading level={4}>Пожаловаться на объявление</Heading>
          <DialogDescription>Расскажите, что не так — мы проверим объявление.</DialogDescription>
        </DialogHeader>

        <div className='flex flex-col gap-4'>
          <div>
            <Label>Причина</Label>
            <Select
              value={reason ?? undefined}
              onValueChange={(value: string | null) => setReason(value as AdReportReason)}
            >
              <SelectTrigger className='w-full px-4'>
                <SelectValue placeholder='Выберите причину'>
                  {(value: string | null) => {
                    const option = AD_REPORT_REASON_OPTIONS.find(item => item.value === value)
                    return option?.label ?? 'Выберите причину'
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {AD_REPORT_REASON_OPTIONS.map(option => (
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
              className='resize-none'
            />
          </div>
        </div>

        <Button size='lg' variant='secondary' type='button' disabled={!reason || isReporting} onClick={handleSubmit}>
          Отправить жалобу
        </Button>
      </DialogContent>
    </Dialog>
  )
}
