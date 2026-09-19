'use client'

import { Button, Heading } from '@/components/ui'

import { ADMIN_BUTTON_CLASS } from '../constants/admin-ui.constants'
import { useApproveDealerFeed, usePendingDealerFeeds } from '../hooks'
import { DealerFeedPreviewDialog } from './dealer-feed-preview-dialog'
import { RejectDealerFeedDialog } from './reject-dealer-feed-dialog'

export const DealerFeedsQueue = () => {
  const { pendingDealerFeeds, isLoading } = usePendingDealerFeeds()
  const { approveDealerFeed, isApprovingDealerFeed } = useApproveDealerFeed()

  return (
    <div className='py-6 text-mist-50'>
      <Heading level={3} className='mb-4 font-medium text-white'>
        Фиды дилеров на проверке
      </Heading>

      {isLoading && <p className='text-sm'>Загрузка...</p>}

      {!isLoading && pendingDealerFeeds.length === 0 && <p className='text-sm'>Нечего проверять — очередь пуста.</p>}

      <div className='flex flex-col gap-3'>
        {pendingDealerFeeds.map(feed => (
          <div key={feed.id} className='flex gap-4 bg-mist-600/50 p-3'>
            <div className='min-w-0 flex-1'>
              <a
                href={feed.url}
                target='_blank'
                rel='noreferrer'
                className='hover:text-primary font-semibold break-all'
              >
                {feed.url}
              </a>
              <p className='text-sm'>
                {feed.user.businessName ?? feed.user.displayName ?? 'Пользователь'} · {feed.user.email ?? '—'}
              </p>
              <p className='text-xs text-mist-300'>Отправлен: {new Date(feed.createdAt).toLocaleString('ru-RU')}</p>
            </div>

            <div className='flex shrink-0 items-start gap-1'>
              <DealerFeedPreviewDialog feedId={feed.id} className={ADMIN_BUTTON_CLASS} />
              <Button
                className={ADMIN_BUTTON_CLASS}
                size='sm'
                disabled={isApprovingDealerFeed}
                onClick={() => approveDealerFeed(feed.id)}
              >
                Одобрить
              </Button>
              <RejectDealerFeedDialog feedId={feed.id} className={ADMIN_BUTTON_CLASS} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
