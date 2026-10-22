import { Pressable, Text, View } from 'react-native'

import { useAdNavigation } from '@/features/ads/hooks/use-ad-navigation'
import type { AdSeller as Seller } from '@/features/ads/types/ad-detail.types'
import { SellerBadges } from '@/features/sellers/components/seller-badges'

import { Avatar } from '@/shared/components/avatar'
import { formatFullDate } from '@/shared/utils/date'
import { pluralizeRu } from '@/shared/utils/pluralize'

interface AdSellerProps {
  seller: Seller
  publishedAt: string | null
  bumpedAt: string | null
}

// Продавец под ценой — как блок продавца сайта: аватар, имя, даты,
// сколько ещё объявлений, тип продавца и премиум. Аватар с именем ведут на
// страницу продавца.
export function AdSeller({ seller, publishedAt, bumpedAt }: AdSellerProps) {
  const { openSeller } = useAdNavigation()
  const publishedDate = publishedAt ? formatFullDate(publishedAt) : null
  // «Обновлено» — дата последнего поднятия, если оно было после публикации
  // и в другой день.
  const bumpedDate =
    bumpedAt && publishedAt && new Date(bumpedAt) > new Date(publishedAt) ? formatFullDate(bumpedAt) : null
  const updatedDate = bumpedDate && bumpedDate !== publishedDate ? bumpedDate : null

  return (
    <View>
      <Pressable
        accessibilityRole='link'
        accessibilityLabel={`Продавец ${seller.displayName ?? 'Пользователь'}`}
        onPress={() => openSeller(seller.id)}
        className='mb-4 flex-row items-center gap-3'
      >
        <Avatar name={seller.displayName} pictureUrl={seller.picture} size='md' colorSeed={seller.id} />
        <View className='flex-1'>
          <Text className='text-base font-medium text-gray-950'>{seller.displayName ?? 'Пользователь'}</Text>
          {publishedDate && <Text className='text-xs text-gray-500'>Опубликовано {publishedDate}</Text>}
          {updatedDate && <Text className='text-xs text-gray-500'>Обновлено {updatedDate}</Text>}
          {seller.adsCount > 0 && (
            <Text className='text-xs text-gray-500'>
              Ещё {seller.adsCount} {pluralizeRu(seller.adsCount, ['объявление', 'объявления', 'объявлений'])} продавца
            </Text>
          )}
        </View>
      </Pressable>

      <SellerBadges seller={seller} className='mb-6' />
    </View>
  )
}
