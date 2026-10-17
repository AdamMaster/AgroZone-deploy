import { memo } from 'react'
import { Pressable, Text, View } from 'react-native'

import { formatPriceWithUnit } from '@/shared/utils/format-price'

import type { FavoriteAd } from '../types/ad.types'
import { AdRowCover } from './ad-row'
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
  return (
    <Pressable
      accessibilityRole='link'
      accessibilityLabel={ad.title}
      onPress={() => onOpen(ad)}
      className='flex-row gap-2.5'
    >
      <View className='h-20 w-22 items-center justify-center overflow-hidden rounded-lg bg-gray-100'>
        <AdRowCover coverUrl={ad.images[0]} adId={ad.id} />
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
