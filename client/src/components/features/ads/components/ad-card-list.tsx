'use client'

import { ImageIcon, MapPin } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { Heading, Skeleton } from '@/components/ui'

import { isFutureDate, isPremiumActive } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { AD_PRICE_HIGHLIGHT_CLASS } from '../constants/ad-services.constants'
import { useAddFavorite } from '../hooks/use-add-favorite'
import { useRemoveFavorite } from '../hooks/use-remove-favorite'
import { type AdCardListData } from '../types/ad.types'
import { AdBadgeChip } from './ad-badge-chip'
import { FavoriteButton } from './favorite-button'

interface AdCardListProps {
  ad: AdCardListData
}

export const AdCardList = ({ ad }: AdCardListProps) => {
  const { addFavorite, isAddingFavorite } = useAddFavorite()
  const { removeFavorite, isRemovingFavorite } = useRemoveFavorite()

  const onClickFavorite = (adId: string, isFavorite: boolean) => {
    if (isFavorite) {
      removeFavorite(adId)
    } else {
      addFavorite(adId)
    }
  }

  const isPriceHighlighted = isFutureDate(ad.priceHighlightUntil) || isPremiumActive(ad.user?.premiumUntil)
  const isBadgeShown = isFutureDate(ad.badgeUntil) && !!ad.badge

  return (
    <article className='relative before:absolute before:-inset-3 before:rounded-3xl before:bg-gray-100 before:opacity-0 before:transition-colors before:content-[""] hover:before:opacity-100'>
      <Link
        href={`/ads/${ad.id}`}
        className='grid w-full grid-cols-[180px_1fr_180px] gap-4 lg:grid-cols-[236px_1fr_236px]'
      >
        <div className='overflow-hidden rounded-xl'>
          <div className='relative block bg-gray-100 pt-[100%]'>
            {ad.images.length > 0 ? (
              <Image
                src={ad.images[0]}
                alt={ad.title}
                className='h-full w-full object-cover object-center'
                fill
                sizes='400px'
              />
            ) : (
              <ImageIcon size={50} className='absolute top-[50%] left-[50%] translate-[-50%] text-gray-500' />
            )}
            {isBadgeShown && <AdBadgeChip badge={ad.badge!} className='absolute top-0 left-0' />}
          </div>
        </div>
        <div className='relative grow'>
          <Heading
            level={2}
            className='hover:text-primary mb-0.5 line-clamp-2 w-fit text-[18px] leading-5 font-medium transition-colors'
          >
            {ad.title}
          </Heading>
          <p className='mb-1 text-[18px]'>
            <strong className={cn(isPriceHighlighted && AD_PRICE_HIGHLIGHT_CLASS)}>
              {ad.price ? ad.price + '₽' : 'Цена договорная'}
            </strong>
          </p>
          <address className='mb-2 text-[13px] leading-4 not-italic'>
            <MapPin className='mr-1.5 inline size-3.5' />
            {ad.address}
          </address>
          <p className='line-clamp-4 text-sm text-gray-600'>{ad.description}</p>
          <FavoriteButton
            onClick={() => onClickFavorite(ad.id, !!ad.isFavorite)}
            isFavorite={ad.isFavorite}
            isLoading={isAddingFavorite || isRemovingFavorite}
          />
        </div>
        <div className='relative ml-2 text-gray-950'>
          <p className='hover:text-primary text-[15px] transition-colors'>{ad.user?.displayName}</p>
        </div>
      </Link>
    </article>
  )
}

AdCardList.Skeleton = function AdCardListSkeleton() {
  return (
    <article className='grid w-full grid-cols-[236px_1fr_236px] gap-4'>
      <div>
        <Skeleton className='block w-59 max-w-59 rounded-xl pt-[100%]' />
      </div>
      <div className='relative'>
        <Skeleton className='mb-1.5 h-4 w-38' />
        <Skeleton className='mb-2 h-4 w-16' />
        <Skeleton className='mb-4 h-4 w-70' />
        <div className='flex flex-col gap-2'>
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-full' />
        </div>
        <Skeleton className='absolute top-0 right-0 size-5' />
      </div>
      <div>
        <Skeleton className='h-5 w-28' />
      </div>
    </article>
  )
}
