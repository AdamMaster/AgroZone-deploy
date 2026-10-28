import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

import { Avatar } from '@/shared/components/avatar'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { CircleCheck } from '@/shared/icons/lucide'
import { formatFullDate } from '@/shared/utils/date'

import type { SellerReview } from '../types/seller-review.types'
import { RatingStars } from './rating-stars'

interface ReviewCardProps {
  review: SellerReview
  // Действия под отзывом (ответить, пожаловаться, изменить и т. п.).
  children?: ReactNode
}

// Один отзыв: автор, оценка, значок основания («Сделка подтверждена» /
// «Не подтверждено продавцом»), текст и ответ продавца — как ReviewCard сайта.
export function ReviewCard({ review, children }: ReviewCardProps) {
  const primaryColor = useThemeColor('--color-primary')
  const isDeleted = !!review.author.deletedAt
  const isDealConfirmed = review.contactType === 'DEAL_CONFIRMED'

  return (
    <View className='gap-3 rounded-xl border border-border p-4'>
      <View className='flex-row items-center gap-3'>
        <Avatar
          name={review.author.displayName}
          pictureUrl={review.author.picture}
          size='base'
          colorSeed={review.author.id}
        />
        <View className='min-w-0 flex-1'>
          <Text numberOfLines={1} className='text-sm font-medium text-gray-950'>
            {isDeleted ? 'Удалённый пользователь' : (review.author.displayName ?? 'Пользователь')}
          </Text>
          <Text className='text-xs text-gray-500'>{formatFullDate(review.createdAt)}</Text>
        </View>
      </View>

      <View className='flex-row flex-wrap items-center gap-x-3 gap-y-1'>
        <RatingStars value={review.rating} />
        {isDealConfirmed ? (
          <View className='flex-row items-center gap-1'>
            <CircleCheck size={14} color={primaryColor} />
            <Text className='text-xs text-primary'>Сделка подтверждена</Text>
          </View>
        ) : (
          <Text className='text-xs text-gray-500'>Не подтверждено продавцом</Text>
        )}
      </View>

      {review.text && <Text className='text-sm text-gray-950'>{review.text}</Text>}

      {review.sellerReply && (
        <View className='rounded-lg bg-gray-50 p-3'>
          <Text className='mb-1 text-xs text-gray-500'>
            Ответ продавца{review.sellerReplyAt && ` · ${formatFullDate(review.sellerReplyAt)}`}
          </Text>
          <Text className='text-sm text-gray-950'>{review.sellerReply}</Text>
        </View>
      )}

      {children}
    </View>
  )
}
