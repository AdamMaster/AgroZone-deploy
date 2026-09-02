'use client'

import { ImageIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { Heading } from '@/components/ui'

import { isFutureDate, isPremiumActive } from '@/shared/utils'

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

  return (
    <article className='flex flex-col gap-2 sm:rounded-none'>
      <Link
        href={`/ads/${ad.id}`}
        className='relative block overflow-hidden rounded-lg bg-gray-100 pt-[100%] sm:rounded-xl'
      >
        {ad.images.length > 0 ? (
          <Image src={ad.images[0]} alt={ad.title} className='h-full w-full object-cover' fill sizes='400px' />
        ) : (
          <ImageIcon size={50} className='absolute top-[50%] left-[50%] translate-[-50%] text-gray-500' />
        )}
        {isBadgeShown && <AdBadgeChip badge={ad.badge!} className='absolute top-1 left-1' />}
      </Link>
      <div className='relative'>
        <Heading
          level={2}
          className='hover:text-primary mb-0.5 line-clamp-2 w-fit pr-6 text-sm leading-snug font-medium transition-colors sm:text-base'
        >
          <Link href={`/ads/${ad.id}`}>{ad.title}</Link>
        </Heading>
        <p>
          <strong className={cn(isPriceHighlighted && AD_PRICE_HIGHLIGHT_CLASS)}>
            {ad.price ? ad.price + '₽' : 'Цена договорная'}
          </strong>
        </p>
        <address className='line-clamp-2 text-[12px] leading-4 not-italic sm:text-[13px]'>
          <span className='sm:hidden'>{ad.locality ?? ad.address}</span>
          <span className='hidden sm:inline'>{ad.address}</span>
        </address>
        <FavoriteButton
          onClick={() => onClickFavorite(ad.id, !!ad.isFavorite)}
          isFavorite={ad.isFavorite}
          isLoading={isAddingFavorite || isRemovingFavorite}
          className='top-1.5 right-1.5 size-4 sm:size-5'
        />
      </div>
    </article>
  )
}

AdCard.Skeleton = function AdCardSkeleton() {
  return <div></div>
}
