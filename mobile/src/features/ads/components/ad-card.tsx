import { memo } from 'react'
import { Text, View } from 'react-native'

import { StyledImage } from '@/shared/components/styled'
import { isFutureDate } from '@/shared/utils/date'
import { formatDistance } from '@/shared/utils/format-distance'
import { formatPriceWithUnit } from '@/shared/utils/format-price'

import type { AdListItem } from '../types/ad.types'
import { AdBadgeChip } from './ad-badge-chip'

interface AdCardProps {
  ad: AdListItem
}

// Карточка объявления в ленте — тот же состав, что у AdCard на сайте:
// фото, значок, название, цена с единицей, населённый пункт и расстояние.
// memo: FlashList переиспользует ячейки и при прокрутке перерисовывает
// только те, у которых сменилось объявление.
export const AdCard = memo(function AdCard({ ad }: AdCardProps) {
  const coverUrl = ad.images[0]
  // Цена выделяется, пока активна платная услуга или премиум у продавца —
  // то же правило, что на сайте.
  const isPriceHighlighted = isFutureDate(ad.priceHighlightUntil) || isFutureDate(ad.user?.premiumUntil)
  const badge = ad.badge && isFutureDate(ad.badgeUntil) ? ad.badge : null
  const distanceLabel = formatDistance(ad.distanceKm)
  const price = formatPriceWithUnit(ad.price, ad.unit)

  return (
    <View className='gap-2' accessible accessibilityLabel={`${ad.title}, ${price}, ${ad.locality ?? ad.address}`}>
      <View className='aspect-square overflow-hidden rounded-xl bg-skeleton'>
        {coverUrl ? (
          <StyledImage
            source={{ uri: coverUrl }}
            className='size-full'
            contentFit='cover'
            // Без recyclingKey переиспользованная FlashList ячейка на долю
            // секунды показывает фото предыдущего объявления.
            recyclingKey={ad.id}
            transition={150}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View className='flex-1 items-center justify-center'>
            <Text className='text-xs text-muted-foreground'>Нет фото</Text>
          </View>
        )}
        {badge && (
          <View className='absolute top-1.5 left-1.5'>
            <AdBadgeChip badge={badge} />
          </View>
        )}
      </View>

      <View className='gap-0.5'>
        <Text className='text-sm leading-snug font-medium text-foreground' numberOfLines={2}>
          {ad.title}
        </Text>
        <View className='flex-row'>
          <Text
            className={
              isPriceHighlighted
                ? 'overflow-hidden rounded bg-price-highlight px-1.5 text-base font-bold text-price-highlight-foreground'
                : 'text-base font-bold text-foreground'
            }
            numberOfLines={1}
          >
            {price}
          </Text>
        </View>
        <Text className='text-xs leading-4 text-foreground' numberOfLines={2}>
          {ad.locality ?? ad.address}
          {distanceLabel && <Text className='text-muted-foreground'> · {distanceLabel}</Text>}
        </Text>
      </View>
    </View>
  )
})

// Заглушка карточки на время первой загрузки — повторяет размеры AdCard,
// чтобы лента не прыгала, когда приходят данные.
export function AdCardSkeleton() {
  return (
    <View className='gap-2'>
      <View className='aspect-square rounded-xl bg-skeleton' />
      <View className='gap-1.5'>
        <View className='h-4 w-4/5 rounded-md bg-skeleton' />
        <View className='h-4 w-1/2 rounded-md bg-skeleton' />
      </View>
    </View>
  )
}
