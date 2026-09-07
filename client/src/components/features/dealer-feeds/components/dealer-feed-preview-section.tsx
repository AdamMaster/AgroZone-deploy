'use client'

import { Button, Heading } from '@/components/ui'

import { useDealerFeedPreview } from '../hooks'

// Кнопка "Проверить фид" — прогоняет DealerFeedParserService по текущей
// ссылке дилера и показывает, сколько позиций валидны и что не так с
// остальными, БЕЗ создания каких-либо объявлений (см. подробный
// комментарий у DealerFeedsService.previewByUrl на бэкенде) — доступно
// дилеру и до, и после одобрения, чтобы самому проверить фид, не дожидаясь
// решения администратора.
export const DealerFeedPreviewSection = () => {
  const { runPreview, preview, isLoadingPreview } = useDealerFeedPreview()

  return (
    <div className='rounded-xl bg-gray-50 p-6'>
      <div className='mb-3 flex items-center justify-between'>
        <Heading level={4} className='font-medium'>
          Предпросмотр
        </Heading>
        <Button size='sm' variant='outline' disabled={isLoadingPreview} onClick={() => runPreview()}>
          Проверить фид
        </Button>
      </div>

      {!preview && <p className='text-sm text-gray-500'>Запустите проверку, чтобы увидеть, что подхватится из фида.</p>}

      {preview?.globalError && <p className='text-sm text-red-600'>{preview.globalError}</p>}

      {preview && !preview.globalError && (
        <div className='text-sm text-gray-600'>
          <p className='mb-2'>
            Валидных позиций: <span className='font-medium text-gray-900'>{preview.totalValid}</span> · С ошибками:{' '}
            <span className='font-medium text-gray-900'>{preview.totalErrors}</span>
          </p>

          {preview.sampleTitles.length > 0 && (
            <p className='mb-2'>Примеры: {preview.sampleTitles.join(', ')}</p>
          )}

          {preview.errors.length > 0 && (
            <ul className='flex flex-col gap-1'>
              {preview.errors.slice(0, 10).map((error, index) => (
                <li key={`${error.offerId ?? 'unknown'}-${index}`} className='rounded bg-white p-2 text-xs'>
                  <span className='font-medium'>{error.offerTitle ?? error.offerId ?? `Позиция #${index + 1}`}</span>:{' '}
                  {error.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
