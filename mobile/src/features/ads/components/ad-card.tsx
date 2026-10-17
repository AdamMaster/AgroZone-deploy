import { memo } from 'react'
import { Pressable, Text, View } from 'react-native'

import { AdPhoto } from '@/shared/components/ad-photo'
import { Skeleton } from '@/shared/components/skeleton'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ImageIcon } from '@/shared/icons/lucide'
import { formatDistance } from '@/shared/utils/format-distance'
import { formatPriceWithUnit } from '@/shared/utils/format-price'

import { getActiveBadge, isPriceHighlighted } from '../lib/ad-promotion'
import type { AdListItem } from '../types/ad.types'
import { AdBadgeChip } from './ad-badge-chip'
import { FavoriteButton } from './favorite-button'

interface AdCardProps {
  ad: AdListItem
  onOpen: (ad: AdListItem) => void
  onToggleFavorite: (ad: AdListItem) => void
  isFavoritePending: boolean
}

// Карточка объявления в выдаче — как AdCard сайта в мобильной вёрстке:
// квадратное фото со значком, название (до двух строк) с сердечком справа,
// цена с единицей, населённый пункт и расстояние.
// memo: FlashList переиспользует ячейки и при прокрутке перерисовывает
// только те, у которых сменилось объявление.
export const AdCard = memo(function AdCard({ ad, onOpen, onToggleFavorite, isFavoritePending }: AdCardProps) {
  const placeholderIconColor = useThemeColor('--color-gray-500')
  const coverUrl = ad.images[0]
  const isHighlighted = isPriceHighlighted(ad)
  const badge = getActiveBadge(ad)
  const distanceLabel = formatDistance(ad.distanceKm)
  const price = formatPriceWithUnit(ad.price, ad.unit)

  return (
    <Pressable accessibilityRole='link' accessibilityLabel={ad.title} onPress={() => onOpen(ad)} className='gap-2'>
      <View className='aspect-square items-center justify-center overflow-hidden rounded-lg bg-gray-100'>
        {coverUrl ? (
          <AdPhoto
            url={coverUrl}
            size='card'
            className='size-full'
            contentFit='cover'
            // Без recyclingKey переиспользованная FlashList ячейка на долю
            // секунды показывает фото предыдущего объявления.
            recyclingKey={ad.id}
            transition={150}
            accessibilityLabel={ad.title}
          />
        ) : (
          <ImageIcon size={50} color={placeholderIconColor} />
        )}
        {badge && (
          <View className='absolute top-1 left-1'>
            <AdBadgeChip badge={badge} />
          </View>
        )}
      </View>

      <View>
        <Text className='mb-0.5 pr-6 text-sm leading-snug font-medium text-gray-950' numberOfLines={2}>
          {ad.title}
        </Text>
        <View className='flex-row'>
          <Text
            className={
              isHighlighted
                ? 'overflow-hidden rounded bg-price-highlight px-1.5 text-[15px] font-bold text-price-highlight-foreground'
                : 'text-[15px] font-bold text-gray-950'
            }
            numberOfLines={1}
          >
            {price}
          </Text>
        </View>
        <Text className='text-xs leading-4 text-gray-950' numberOfLines={2}>
          {ad.locality ?? ad.address}
          {distanceLabel && <Text className='text-gray-500'> · {distanceLabel}</Text>}
        </Text>

        <View className='absolute -top-1.5 -right-0.5'>
          <FavoriteButton
            isFavorite={!!ad.isFavorite}
            isLoading={isFavoritePending}
            onPress={() => onToggleFavorite(ad)}
          />
        </View>
      </View>
    </Pressable>
  )
})

// Заглушка карточки на время первой загрузки — как AdCard.Skeleton сайта.
export function AdCardSkeleton() {
  return (
    <View className='gap-2'>
      <Skeleton className='aspect-square rounded-lg' />
      <View className='gap-2'>
        <Skeleton className='h-4 w-30 rounded-md' />
        <Skeleton className='h-4 w-20 rounded-md' />
      </View>
    </View>
  )
}
