'use client'

import { useState } from 'react'

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui'

import { useAdminDealerFeedPreview } from '../hooks'

interface DealerFeedPreviewDialogProps {
  feedId: string
  className?: string
}

// Даёт админу прогнать DealerFeedParserService по фиду ПЕРЕД тем, как
// одобрить или отклонить его — та же проверка, что доступна дилеру у себя
// в кабинете (см. DealerFeedPreviewSection), но со стороны админа и без
// создания объявлений.
export const DealerFeedPreviewDialog = ({ feedId, className }: DealerFeedPreviewDialogProps) => {
  const [open, setOpen] = useState(false)
  const { runAdminPreview, preview, isLoadingAdminPreview } = useAdminDealerFeedPreview()

  const handleOpenChange = (value: boolean) => {
    setOpen(value)
    if (value) runAdminPreview(feedId)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant='ghost' size='sm' className={className} />}>Просмотреть</DialogTrigger>

      <DialogContent className='max-w-160'>
        <DialogHeader>
          <DialogTitle>Предпросмотр фида</DialogTitle>
          <DialogDescription>Результат разбора фида без создания объявлений.</DialogDescription>
        </DialogHeader>

        {isLoadingAdminPreview && <p className='text-sm text-gray-500'>Загрузка...</p>}

        {!isLoadingAdminPreview && preview?.globalError && (
          <p className='text-sm text-red-600'>{preview.globalError}</p>
        )}

        {!isLoadingAdminPreview && preview && !preview.globalError && (
          <div className='text-sm text-gray-600'>
            <p className='mb-2'>
              Валидных позиций: <span className='font-medium text-gray-900'>{preview.totalValid}</span> · С ошибками:{' '}
              <span className='font-medium text-gray-900'>{preview.totalErrors}</span>
            </p>

            {preview.sampleTitles.length > 0 && <p className='mb-2'>Примеры: {preview.sampleTitles.join(', ')}</p>}

            {preview.errors.length > 0 && (
              <ul className='flex max-h-80 flex-col gap-1 overflow-y-auto'>
                {preview.errors.slice(0, 10).map((error, index) => (
                  <li key={`${error.offerId ?? 'unknown'}-${index}`} className='rounded bg-gray-50 p-2 text-xs'>
                    <span className='font-medium'>{error.offerTitle ?? error.offerId ?? `Позиция #${index + 1}`}</span>:{' '}
                    {error.reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
