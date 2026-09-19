'use client'

import Image from 'next/image'
import Link from 'next/link'

import { Button, Heading } from '@/components/ui'

import { formatPhoneNumber } from '@/shared/utils'

import { usePendingAds, usePublishAd } from '../../ads/hooks'
import { ADMIN_BUTTON_CLASS } from '../constants/admin-ui.constants'
import { RejectAdDialog } from './reject-ad-dialog'

export const ModerationQueue = () => {
  const { pendingAds, isLoading } = usePendingAds()
  const { publishAd, isLoadingPublish } = usePublishAd()

  return (
    <div className='py-6 text-mist-50'>
      {isLoading && <p className='text-sm'>Загрузка...</p>}

      {!isLoading && pendingAds.length === 0 && <p className='text-sm'>Нечего проверять — очередь пуста.</p>}

      <div className='flex flex-col gap-3'>
        {pendingAds.map(ad => (
          <div key={ad.id} className='flex gap-4 rounded-md bg-mist-700/50 p-3'>
            <div className='relative size-20 shrink-0 overflow-hidden rounded-md'>
              {ad.images[0] && <Image src={ad.images[0]} alt={ad.title} fill className='object-cover' sizes='200px' />}
            </div>

            <div className='min-w-0 flex-1'>
              <Link href={`/admin/moderation/${ad.id}`} className='hover:text-primary font-semibold'>
                {ad.title}
              </Link>
              <p className='text-sm'>
                {ad.user.displayName ?? 'Пользователь'} ·{' '}
                {ad.user.email ?? formatPhoneNumber(ad.user.phones[0]?.phone) ?? '—'}
              </p>
            </div>

            <div className='flex shrink-0 gap-1'>
              <Button variant='mist' size='default' disabled={isLoadingPublish} onClick={() => publishAd(ad.id)}>
                Опубликовать
              </Button>
              <RejectAdDialog adId={ad.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
