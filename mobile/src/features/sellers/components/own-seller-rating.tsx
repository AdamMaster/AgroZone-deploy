import { Pressable, Text, View } from 'react-native'

import { useSiteFlags } from '@/features/site-settings/hooks/use-site-flags'

import type { OwnSellerRating as OwnSellerRatingValue } from '../types/seller-review.types'
import { RatingStars } from './rating-stars'
import { formatReviewsCount } from './seller-rating'

interface OwnSellerRatingProps {
  rating?: OwnSellerRatingValue
  // Показать подсказку, если другие пользователи пока не видят рейтинг.
  showHint?: boolean
  // Переход к своим отзывам.
  onPress: () => void
}

// Свой рейтинг владельца в кабинете (меню профиля, «Личные данные»), как
// OwnSellerRating сайта. Среднее владелец видит сразу, даже если другим оно
// ещё не показывается (isPublic). Не рисуется при выключенных рейтингах.
export function OwnSellerRating({ rating, showHint = false, onPress }: OwnSellerRatingProps) {
  const { sellerRatings } = useSiteFlags()

  if (!sellerRatings || !rating) return null

  const hasAverage = rating.average !== null

  return (
    <View>
      <Pressable
        accessibilityRole='link'
        accessibilityLabel='Мои отзывы'
        onPress={onPress}
        hitSlop={6}
        className='flex-row flex-wrap items-center gap-1.5 active:opacity-70'
      >
        {hasAverage ? (
          <>
            <Text className='text-sm font-medium text-gray-950'>{rating.average!.toFixed(1).replace('.', ',')}</Text>
            <RatingStars value={rating.average!} />
            <Text className='text-sm text-gray-500'>{formatReviewsCount(rating.count)}</Text>
          </>
        ) : (
          <Text className='text-sm text-gray-500'>Пока нет отзывов</Text>
        )}
      </Pressable>
      {showHint && !rating.isPublic && (
        <Text className='mt-1 text-xs text-gray-500'>
          {hasAverage
            ? 'Другие пользователи пока не видят этот рейтинг: он появится, когда наберётся достаточно отзывов.'
            : 'Рейтинг появится после первого отзыва.'}
        </Text>
      )}
    </View>
  )
}
