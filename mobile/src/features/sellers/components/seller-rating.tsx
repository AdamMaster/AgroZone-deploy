import { Pressable, Text, View } from 'react-native'

import { useSiteFlags } from '@/features/site-settings/hooks/use-site-flags'

import { pluralizeRu } from '@/shared/utils/pluralize'

import type { SellerRating as SellerRatingValue } from '../types/seller-review.types'
import { RatingStars } from './rating-stars'

export const formatReviewsCount = (count: number) => `${count} ${pluralizeRu(count, ['отзыв', 'отзыва', 'отзывов'])}`

interface SellerRatingSummaryProps {
  rating?: SellerRatingValue
  // Нажатие — переход к отзывам продавца. Без него — просто текст (например,
  // внутри блока, который сам ведёт на страницу продавца).
  onPress?: () => void
  // Показывать «Пока нет оценок», когда среднего ещё нет (по умолчанию
  // скрыто, чтобы не загромождать места, где рейтинг — дополнение).
  showEmpty?: boolean
}

// Рейтинг продавца: среднее, звёзды и число отзывов — как SellerRatingSummary
// сайта. Не рисуется, пока рейтинги выключены в админке: сервер и так не
// присылает поле rating, но закешированный ответ мог сохранить его до
// выключения, поэтому флаг проверяем и здесь.
export function SellerRatingSummary({ rating, onPress, showEmpty = false }: SellerRatingSummaryProps) {
  const { sellerRatings } = useSiteFlags()

  if (!sellerRatings || !rating) return null

  const { average, count } = rating

  if (average === null && !showEmpty) return null

  const content =
    average === null ? (
      <Text className='text-sm text-gray-500'>Пока нет оценок</Text>
    ) : (
      <View className='flex-row flex-wrap items-center gap-1.5'>
        <Text className='text-sm font-medium text-gray-950'>{average.toFixed(1)}</Text>
        <RatingStars value={average} />
        <Text className='text-sm text-gray-950'>{formatReviewsCount(count)}</Text>
      </View>
    )

  if (!onPress) return <View>{content}</View>

  return (
    <Pressable accessibilityRole='link' onPress={onPress} hitSlop={6} className='active:opacity-70'>
      {content}
    </Pressable>
  )
}
