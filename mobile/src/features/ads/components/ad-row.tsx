import { View } from 'react-native'

import { AdPhoto } from '@/shared/components/ad-photo'
import { Skeleton } from '@/shared/components/skeleton'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ImageIcon } from '@/shared/icons/lucide'

// Строка списка объявлений — «Избранное» и «Мои объявления» (AdShortCard и
// AdFavoriteCard сайта на телефоне): фото 88×80 слева, текст справа. Здесь
// общие части; сами строки отличаются (сердечко, статусы, карандаш).

interface AdRowCoverProps {
  // Первое фото объявления; нет фото — значок-заглушка.
  coverUrl: string | undefined
  adId: string
}

// Содержимое рамки фото: копия 400 или заглушка. Рамку (размер, фон, нажатие)
// задаёт сама строка.
export function AdRowCover({ coverUrl, adId }: AdRowCoverProps) {
  const placeholderIconColor = useThemeColor('--color-gray-400')

  return coverUrl ? (
    <AdPhoto url={coverUrl} size={400} className='size-full' contentFit='cover' recyclingKey={adId} />
  ) : (
    <ImageIcon size={32} color={placeholderIconColor} />
  )
}

// Заглушка строки на время загрузки (AdShortCardSkeleton сайта).
export function AdRowSkeleton() {
  return (
    <View className='flex-row gap-2.5'>
      <Skeleton className='h-20 w-22 rounded-lg' />
      <View className='flex-1 gap-2'>
        <Skeleton className='h-4 w-4/5 rounded-md' />
        <Skeleton className='h-4 w-1/3 rounded-md' />
      </View>
    </View>
  )
}
