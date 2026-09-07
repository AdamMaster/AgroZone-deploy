'use client'

import { useState } from 'react'

import { Button, Heading } from '@/components/ui'

import { useDealerFeedPause, useDealerFeedResume, useDealerFeedSync } from '../hooks'
import { IDealerFeed } from '../types/dealer-feed.types'

const formatDateTime = (value: string) => {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(
    new Date(value)
  )
}

interface DealerFeedSyncSectionProps {
  dealerFeed: IDealerFeed
}

export const DealerFeedSyncSection = ({ dealerFeed }: DealerFeedSyncSectionProps) => {
  const [showErrors, setShowErrors] = useState(false)
  const { pauseDealerFeed, isPausingDealerFeed } = useDealerFeedPause()
  const { resumeDealerFeed, isResumingDealerFeed } = useDealerFeedResume()
  const { syncDealerFeedNow, isSyncingDealerFeed } = useDealerFeedSync()

  const errors = dealerFeed.lastSyncItemErrors ?? []

  return (
    <div className='rounded-xl bg-gray-50 p-6'>
      <div className='mb-3 flex items-center justify-between'>
        <Heading level={4} className='font-medium'>
          Синхронизация
        </Heading>

        <div className='flex gap-2'>
          {dealerFeed.isPaused ? (
            <Button size='sm' variant='outline' disabled={isResumingDealerFeed} onClick={() => resumeDealerFeed()}>
              Возобновить
            </Button>
          ) : (
            <Button size='sm' variant='outline' disabled={isPausingDealerFeed} onClick={() => pauseDealerFeed()}>
              Приостановить
            </Button>
          )}
          <Button size='sm' disabled={isSyncingDealerFeed} onClick={() => syncDealerFeedNow()}>
            Обновить сейчас
          </Button>
        </div>
      </div>

      {dealerFeed.isPaused && (
        <p className='mb-3 text-sm text-amber-600'>Синхронизация приостановлена вами — новые позиции не подтягиваются.</p>
      )}

      {!dealerFeed.lastSyncAt ? (
        <p className='text-sm text-gray-500'>Синхронизации ещё не было.</p>
      ) : (
        <div className='text-sm text-gray-600'>
          <p className='mb-1'>Последняя синхронизация: {formatDateTime(dealerFeed.lastSyncAt)}</p>

          {dealerFeed.lastSyncError ? (
            <p className='text-red-600'>{dealerFeed.lastSyncError}</p>
          ) : (
            <p>
              Создано: {dealerFeed.lastSyncItemsCreated ?? 0} · Обновлено: {dealerFeed.lastSyncItemsUpdated ?? 0} ·
              Снято с публикации: {dealerFeed.lastSyncItemsRemoved ?? 0} · Ошибок: {dealerFeed.lastSyncItemsFailed ?? 0}
            </p>
          )}

          {errors.length > 0 && (
            <div className='mt-2'>
              <button type='button' onClick={() => setShowErrors(v => !v)} className='text-primary underline'>
                {showErrors ? 'Скрыть ошибки' : `Показать ошибки (${errors.length})`}
              </button>

              {showErrors && (
                <ul className='mt-2 flex flex-col gap-1'>
                  {errors.map((error, index) => (
                    <li key={`${error.offerId ?? 'unknown'}-${index}`} className='rounded bg-white p-2 text-xs'>
                      <span className='font-medium'>{error.offerTitle ?? error.offerId ?? `Позиция #${index + 1}`}</span>
                      : {error.reason}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
