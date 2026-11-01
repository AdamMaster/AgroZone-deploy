import { Text, View } from 'react-native'

import { AdBadgeChip } from '@/features/ads/components/ad-badge-chip'
import type { AdBadge } from '@/features/ads/types/ad.types'

import { AdPhoto } from '@/shared/components/ad-photo'
import { Skeleton } from '@/shared/components/skeleton'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ArrowUp, ImageIcon } from '@/shared/icons/lucide'
import { formatPrice } from '@/shared/utils/format-price'

interface AdPreviewCardProps {
  photoUrl: string | undefined
  badge: AdBadge | undefined
  price: number | null
  isPriceHighlighted: boolean
  isBumped: boolean
}

// «Так будет выглядеть объявление» — превью карточки с уже выбранными
// услугами: значок на фото, выделенная цена, пометка о подъёме. Название и
// описание — серые заглушки, как на сайте: важно показать, как изменится
// карточка, а не её текст.
export function AdPreviewCard({ photoUrl, badge, price, isPriceHighlighted, isBumped }: AdPreviewCardProps) {
  const placeholderColor = useThemeColor('--color-gray-500')

  return (
    <View className='rounded-xl bg-white p-4 shadow-md dark:bg-neutral-800'>
      <Text className='mb-3 text-xs font-medium text-gray-500'>Так будет выглядеть объявление</Text>

      <View className='relative mb-3 aspect-[4/3] items-center justify-center overflow-hidden rounded-lg bg-gray-100'>
        {photoUrl ? (
          <AdPhoto url={photoUrl} size='card' className='size-full' contentFit='cover' />
        ) : (
          <ImageIcon size={40} color={placeholderColor} />
        )}
        {badge && (
          <View className='absolute top-1 left-1'>
            <AdBadgeChip badge={badge} />
          </View>
        )}
      </View>

      <Skeleton className='mb-1.5 h-3.5 w-full rounded dark:bg-neutral-300' />
      <Skeleton className='mb-3 h-3.5 w-2/3 rounded dark:bg-neutral-300' />

      <View className='items-start'>
        <Text
          className={`text-lg font-bold text-gray-950 ${
            isPriceHighlighted ? 'overflow-hidden rounded bg-amber-200 px-1.5 dark:text-neutral-900' : ''
          }`}
        >
          {formatPrice(price)}
        </Text>
      </View>

      {isBumped && (
        <View className='mt-2 flex-row items-center gap-1'>
          <ArrowUp size={12} color='#fe9a00' />
          <Text className='text-xs text-amber-500'>Будет выше в поиске</Text>
        </View>
      )}
    </View>
  )
}
