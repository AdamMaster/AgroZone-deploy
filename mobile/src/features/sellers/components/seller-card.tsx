import * as WebBrowser from 'expo-web-browser'
import { Pressable, Text, View } from 'react-native'

import { Avatar } from '@/shared/components/avatar'
import { Heading } from '@/shared/components/heading'
import { Skeleton } from '@/shared/components/skeleton'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { FileText } from '@/shared/icons/lucide'
import { formatMonthYear } from '@/shared/utils/date'
import { pluralizeRu } from '@/shared/utils/pluralize'

import type { PublicSeller } from '../types/seller.types'
import { SellerBadges } from './seller-badges'
import { SellerRatingSummary } from './seller-rating'

// Карточка продавца — SellerCard сайта на телефоне: слева имя, чипы, с каких
// пор на сайте и сколько объявлений, справа аватар; ниже презентация
// компании, если продавец её загрузил.
export function SellerCard({ seller, onOpenReviews }: { seller: PublicSeller; onOpenReviews?: () => void }) {
  const iconColor = useThemeColor('--color-gray-400')
  const { presentationUrl } = seller

  return (
    <View className='flex-row justify-between gap-4'>
      <View className='min-w-0 flex-1'>
        <Heading level={2}>{seller.displayName ?? 'Пользователь'}</Heading>

        <SellerBadges seller={seller} className='mt-2' />

        {/* Рейтинг под именем, как на сайте: нажатие открывает вкладку «Отзывы». */}
        <View className='mt-2'>
          <SellerRatingSummary rating={seller.rating} showEmpty onPress={onOpenReviews} />
        </View>

        <View className='gap-1 pt-4'>
          <Text className='text-sm text-gray-500'>На сайте с {formatMonthYear(seller.createdAt)}</Text>
          <Text className='text-sm text-gray-500'>
            {seller.adsCount} {pluralizeRu(seller.adsCount, ['объявление', 'объявления', 'объявлений'])}
          </Text>
        </View>

        {presentationUrl && (
          <Pressable
            accessibilityRole='link'
            onPress={() => void WebBrowser.openBrowserAsync(presentationUrl)}
            className='mt-3 flex-row items-center gap-2 rounded-lg border border-border p-2.5 active:bg-gray-50'
          >
            <FileText size={18} color={iconColor} />
            <Text numberOfLines={1} className='min-w-0 flex-1 text-sm font-medium text-gray-950'>
              {seller.presentationFileName ?? 'Презентация компании'}
            </Text>
          </Pressable>
        )}
      </View>

      <Avatar name={seller.displayName} pictureUrl={seller.picture} size='xl' colorSeed={seller.id} />
    </View>
  )
}

// Пока продавец грузится — заглушка того же размера.
export function SellerCardSkeleton() {
  return (
    <View className='flex-row justify-between gap-4'>
      <View className='flex-1 gap-3'>
        <Skeleton className='h-6 w-2/3 rounded' />
        <Skeleton className='h-6 w-1/3 rounded-full' />
        <Skeleton className='h-4 w-1/2 rounded' />
      </View>
      <Skeleton className='size-16 rounded-full' />
    </View>
  )
}
