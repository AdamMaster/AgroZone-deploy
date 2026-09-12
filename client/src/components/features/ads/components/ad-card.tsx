'use client'

import { ImageIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { Heading, Skeleton } from '@/components/ui'

import { formatDistance, formatPriceWithUnit, isFutureDate, isPremiumActive } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { AD_PRICE_HIGHLIGHT_CLASS } from '../constants/ad-services.constants'
import { useAddFavorite } from '../hooks/use-add-favorite'
import { useRemoveFavorite } from '../hooks/use-remove-favorite'
import { type AdCardData } from '../types/ad.types'
import { AdBadgeChip } from './ad-badge-chip'
import { FavoriteButton } from './favorite-button'

interface AdCardProps {
  ad: AdCardData
}

export const AdCard = ({ ad }: AdCardProps) => {
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
  const distanceLabel = formatDistance(ad.distanceKm)

  return (
    <article className='flex flex-col gap-2 sm:rounded-none'>
      <Link
        href={`/ads/${ad.id}`}
        className='relative block overflow-hidden rounded-lg bg-gray-100 pt-[100%] sm:rounded-xl'
      >
        {ad.images.length > 0 ? (
          <Image src={ad.images[0]} alt={ad.title} className='h-full w-full object-cover' fill sizes='310px' />
        ) : (
          <ImageIcon size={50} className='absolute top-[50%] left-[50%] translate-[-50%] text-gray-500' />
        )}
        {isBadgeShown && <AdBadgeChip badge={ad.badge!} className='absolute top-1 left-1' />}
      </Link>
      <div className='relative'>
        <Heading
          level={2}
          as='h3'
          className='hover:text-primary mb-0.5 line-clamp-2 w-fit pr-6 text-sm leading-snug font-medium transition-colors sm:text-base'
        >
          <Link href={`/ads/${ad.id}`}>{ad.title}</Link>
        </Heading>
        <p>
          <strong className={cn(isPriceHighlighted && AD_PRICE_HIGHLIGHT_CLASS)}>
            {formatPriceWithUnit(ad.price, ad.unit)}
          </strong>
        </p>
        <address className='line-clamp-2 text-[12px] leading-4 not-italic sm:text-[13px]'>
          <span className='sm:hidden'>{ad.locality ?? ad.address}</span>
          <span className='hidden sm:inline'>{ad.address}</span>
          {distanceLabel && <span className='text-gray-500'> · {distanceLabel}</span>}
        </address>
        <FavoriteButton
          onClick={() => onClickFavorite(ad.id, !!ad.isFavorite)}
          isFavorite={ad.isFavorite}
          isLoading={isAddingFavorite || isRemovingFavorite}
          className='top-0 right-0 size-auto'
          iconClassName='size-4 sm:size-5'
        />
      </div>
    </article>
  )
}

AdCard.Skeleton = function AdCardSkeleton() {
  return (
    <div className='flex flex-col gap-2'>
      <Skeleton className='rounded-lg pt-[100%]' />
      <div className='flex flex-col gap-2'>
        <Skeleton className='h-4 w-30 rounded-md' />
        <Skeleton className='h-4 w-20 rounded-md' />
      </div>
    </div>
  )
}
