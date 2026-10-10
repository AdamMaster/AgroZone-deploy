import { Text, View } from 'react-native'

import type { AdSeller as Seller } from '@/features/ads/types/ad-detail.types'

import { Avatar } from '@/shared/components/avatar'
import { SELLER_TYPE_LABELS } from '@/shared/constants/seller-types'
import { Crown } from '@/shared/icons/lucide'
import { formatFullDate, isFutureDate } from '@/shared/utils/date'
import { pluralizeRu } from '@/shared/utils/pluralize'

interface AdSellerProps {
  seller: Seller
  publishedAt: string | null
  bumpedAt: string | null
}

// Продавец под ценой — как блок продавца сайта: аватар, имя, даты,
// сколько ещё объявлений, тип продавца и премиум.
export function AdSeller({ seller, publishedAt, bumpedAt }: AdSellerProps) {
  const publishedDate = publishedAt ? formatFullDate(publishedAt) : null
  // «Обновлено» — дата последнего поднятия, если оно было после публикации
  // и в другой день.
  const bumpedDate =
    bumpedAt && publishedAt && new Date(bumpedAt) > new Date(publishedAt) ? formatFullDate(bumpedAt) : null
  const updatedDate = bumpedDate && bumpedDate !== publishedDate ? bumpedDate : null
  const isPremium = isFutureDate(seller.premiumUntil)
  // Название ИП/компании показываем, только если продавец подтвердил его по
  // ИНН; частное лицо — подписью типа.
  const businessName = seller.type !== 'INDIVIDUAL' && seller.businessVerifiedAt ? seller.businessName : null
  const typeLabel = seller.type === 'INDIVIDUAL' ? SELLER_TYPE_LABELS.INDIVIDUAL : businessName

  return (
    <View>
      <View className='mb-4 flex-row items-center gap-3'>
        <Avatar name={seller.displayName} pictureUrl={seller.picture} size='md' colorSeed={seller.id} />
        <View className='flex-1'>
          <Text className='font-medium text-gray-950'>{seller.displayName ?? 'Пользователь'}</Text>
          {publishedDate && <Text className='text-xs text-gray-500'>Опубликовано {publishedDate}</Text>}
          {updatedDate && <Text className='text-xs text-gray-500'>Обновлено {updatedDate}</Text>}
          {seller.adsCount > 0 && (
            <Text className='text-xs text-gray-500'>
              Ещё {seller.adsCount} {pluralizeRu(seller.adsCount, ['объявление', 'объявления', 'объявлений'])} продавца
            </Text>
          )}
        </View>
      </View>

      {(typeLabel || isPremium) && (
        <View className='mb-6 flex-row flex-wrap gap-2'>
          {typeLabel && <Text className='rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600'>{typeLabel}</Text>}
          {isPremium && (
            <View className='flex-row items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1'>
              <Crown size={11} color='#b45309' />
              <Text className='text-xs text-amber-700'>Премиум</Text>
            </View>
          )}
        </View>
      )}
    </View>
  )
}
