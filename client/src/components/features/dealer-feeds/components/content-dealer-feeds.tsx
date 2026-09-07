'use client'

import { Heading, Skeleton } from '@/components/ui'

import { useDealerFeed } from '../hooks'
import { DealerFeedPreviewSection } from './dealer-feed-preview-section'
import { DealerFeedStatusBadge } from './dealer-feed-status-badge'
import { DealerFeedSyncSection } from './dealer-feed-sync-section'
import { DealerFeedTariffSection } from './dealer-feed-tariff-section'
import { DealerSubscriptionStatusHandler } from './dealer-subscription-status-handler'
import { SubmitDealerFeedForm } from './submit-dealer-feed-form'

export const ContentDealerFeeds = () => {
  const { dealerFeed, isLoading } = useDealerFeed()

  return (
    <div>
      <DealerSubscriptionStatusHandler />

      <Heading level={2} className='mb-6'>
        Фиды
      </Heading>

      {isLoading && <Skeleton className='h-48 w-full max-w-2xl rounded-xl' />}

      {!isLoading && !dealerFeed && (
        <div className='max-w-xl'>
          <p className='mb-4 text-sm text-gray-600'>
            Подключите ссылку на XML-фид с вашими объявлениями — вместо того чтобы добавлять их вручную по одному, мы
            будем автоматически подтягивать и обновлять их по расписанию. Массовый импорт требует одобрения
            администратором, а сама синхронизация — оплаченного тарифа (ниже, после подключения).
          </p>
          <SubmitDealerFeedForm submitLabel='Отправить на проверку' />
        </div>
      )}

      {!isLoading && dealerFeed && (
        <div className='flex max-w-2xl flex-col gap-4'>
          <div className='rounded-xl bg-gray-50 p-6'>
            <div className='mb-2 flex items-center gap-2'>
              <Heading level={4} className='font-medium'>
                Статус фида
              </Heading>
              <DealerFeedStatusBadge status={dealerFeed.status} />
            </div>

            <p className='mb-4 truncate text-sm text-gray-500'>{dealerFeed.url}</p>

            {dealerFeed.status === 'REJECTED' && dealerFeed.rejectionReason && (
              <p className='mb-4 text-sm text-red-600'>Причина отклонения: {dealerFeed.rejectionReason}</p>
            )}

            <details className='text-sm'>
              <summary className='text-primary cursor-pointer'>Изменить ссылку на фид</summary>
              <div className='mt-3'>
                <SubmitDealerFeedForm currentUrl={dealerFeed.url} submitLabel='Сохранить и отправить на проверку' />
                <p className='mt-2 text-xs text-gray-500'>
                  Смена ссылки заново отправит фид на проверку администратором.
                </p>
              </div>
            </details>
          </div>

          {dealerFeed.status === 'APPROVED' && (
            <>
              <DealerFeedTariffSection dealerFeed={dealerFeed} />
              <DealerFeedSyncSection dealerFeed={dealerFeed} />
            </>
          )}

          <DealerFeedPreviewSection />
        </div>
      )}
    </div>
  )
}
