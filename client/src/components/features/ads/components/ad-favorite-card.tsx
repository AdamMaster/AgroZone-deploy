import { ImageIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

import { Heading } from '@/components/ui'

import { useAddFavorite, useRemoveFavorite } from '../hooks'
import { type AdCardData, IAd } from '../types/ad.types'
import { FavoriteButton } from './favorite-button'

interface AdFavoriteCardProps {
  favorite: AdCardData
}

export const AdFavoriteCard = ({ favorite }: AdFavoriteCardProps) => {
  const { isAddingFavorite } = useAddFavorite()
  const { removeFavorite, isRemovingFavorite } = useRemoveFavorite()

  const onClickFavorite = (id: string) => {
    removeFavorite(id)
  }

  return (
    <div className='flex max-w-122 gap-2.5 sm:gap-4'>
      <Link
        href={`/ads/${favorite.id}`}
        className='relative flex h-20 w-22 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 sm:h-30 sm:w-40'
      >
        {favorite.images.length ? (
          <Image
            src={favorite.images?.[0] || ''}
            alt={favorite.title}
            className='h-full w-full object-cover'
            fill
            sizes='160px'
          />
        ) : (
          <ImageIcon className='size-8 text-gray-400' />
        )}
      </Link>

      <div className='flex flex-grow flex-col'>
        <div className='relative flex gap-3'>
          <Heading level={4} className='font-normal sm:text-lg sm:font-bold'>
            <Link href={`/ads/${favorite.id}`} className='hover:text-primary'>
              {favorite.title}
            </Link>
          </Heading>
          <FavoriteButton
            onClick={() => removeFavorite(favorite.id)}
            isFavorite={true}
            isLoading={isRemovingFavorite}
          />
        </div>
        <p className='text-[16px] font-bold sm:mb-3 sm:text-lg'>
          {favorite.price ? `${favorite.price} ₽` : 'Цена договорная'}
        </p>
        <p className='text-[13px] text-gray-500'>{favorite.address}</p>
      </div>
    </div>
  )
}
