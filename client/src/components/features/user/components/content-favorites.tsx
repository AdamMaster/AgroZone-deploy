'use client'

import { Heading } from '@/components/ui'

import { AdShortCardSkeleton } from '../../ads/components'
import { AdFavoriteCard } from '../../ads/components/ad-favorite-card'
import { useGetFavorites } from '../../ads/hooks'
import { AdCardData } from '../../ads/types/ad.types'

export const ContentFavorites = () => {
  const { favorites, isLoadingFavorites } = useGetFavorites()

  return (
    <div className='max-w-[800px]'>
      <Heading level={2} className='mb-8'>
        Избранное
      </Heading>
      {isLoadingFavorites ? (
        <div className='grid grid-cols-1 gap-4 sm:gap-6'>
          {Array.from({ length: 3 }).map((_, i) => (
            <AdShortCardSkeleton key={i} />
          ))}
        </div>
      ) : favorites.length > 0 ? (
        <div className='grid grid-cols-1 gap-4 sm:gap-6'>
          {favorites.map(ad => (
            <AdFavoriteCard key={ad.id} favorite={ad} />
          ))}
        </div>
      ) : (
        <div>
          <Heading level={3} className='mb-2'>
            Добавляйте объявления в избранное
          </Heading>
          <p className='text-[15px] leading-[1.4] text-gray-600'>
            Нашли что-то интересное? Нажмите на сердечко в результатах поиска, или кнопку «В избранное» в объявлении,
            чтобы не потерять интересные предложения.
          </p>
        </div>
      )}
    </div>
  )
}
