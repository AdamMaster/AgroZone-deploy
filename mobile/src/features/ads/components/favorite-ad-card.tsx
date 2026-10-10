import { memo } from 'react'
import { Pressable, Text, View } from 'react-native'

import { StyledImage } from '@/shared/components/styled'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ImageIcon } from '@/shared/icons/lucide'
import { formatPriceWithUnit } from '@/shared/utils/format-price'

import type { FavoriteAd } from '../types/ad.types'
import { FavoriteButton } from './favorite-button'

interface FavoriteAdCardProps {
  ad: FavoriteAd
  onOpen: (ad: FavoriteAd) => void
  onRemove: (ad: FavoriteAd) => void
  isRemoving: boolean
}

// Строка избранного — как AdFavoriteCard сайта на телефоне: фото 88×80,
// название с красным сердечком, цена, адрес.
export const FavoriteAdCard = memo(function FavoriteAdCard({ ad, onOpen, onRemove, isRemoving }: FavoriteAdCardProps) {
  const placeholderIconColor = useThemeColor('--color-gray-400')
  const coverUrl = ad.images[0]

  return (
    <Pressable
      accessibilityRole='link'
      accessibilityLabel={ad.title}
      onPress={() => onOpen(ad)}
      className='flex-row gap-2.5'
    >
      <View className='h-20 w-22 items-center justify-center overflow-hidden rounded-lg bg-gray-100'>
        {coverUrl ? (
          <StyledImage source={{ uri: coverUrl }} className='size-full' contentFit='cover' recyclingKey={ad.id} />
        ) : (
          <ImageIcon size={32} color={placeholderIconColor} />
        )}
      </View>

      <View className='flex-1'>
        <View className='flex-row gap-3'>
          <Text className='flex-1 text-base leading-tight text-gray-900' numberOfLines={3}>
            {ad.title}
          </Text>
          <View className='-mt-1.5'>
            <FavoriteButton isFavorite isLoading={isRemoving} onPress={() => onRemove(ad)} size={20} />
          </View>
        </View>
        <Text className='text-base font-bold text-gray-950'>{formatPriceWithUnit(ad.price, ad.unit)}</Text>
        <Text className='text-[13px] text-gray-500'>{ad.address}</Text>
      </View>
    </Pressable>
  )
})

// Заглушка строки на время загрузки (AdShortCard.Skeleton сайта).
export function FavoriteAdCardSkeleton() {
  return (
    <View className='flex-row gap-2.5'>
      <View className='h-20 w-22 rounded-lg bg-gray-100' />
      <View className='flex-1 gap-2'>
        <View className='h-4 w-4/5 rounded-md bg-gray-100' />
        <View className='h-4 w-1/3 rounded-md bg-gray-100' />
      </View>
    </View>
  )
}
