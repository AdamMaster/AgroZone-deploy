import { useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'

import { Heading } from '@/shared/components/heading'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Clock, EyeOff } from '@/shared/icons/lucide'

import { useRemoveSellerReview, useUpdateSellerReview } from '../hooks/use-seller-review-actions'
import type { SellerReview } from '../types/seller-review.types'
import { ReviewCard } from './review-card'
import { ReviewFormDialog } from './review-form-dialog'

// amber-700 — как у текста плашки; в теме приложения такого токена нет.
const AMBER_ICON_COLOR = '#b45309'

interface MySellerReviewProps {
  review: SellerReview
  sellerId: string
}

// Свой отзыв автора: правка, удаление и пометка статуса. «На проверке» —
// отзыв виден только автору, пока его не проверит модератор; скрытый
// модератором не правится и в рейтинг не входит. Как MySellerReview сайта.
export function MySellerReview({ review, sellerId }: MySellerReviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const update = useUpdateSellerReview(sellerId)
  const remove = useRemoveSellerReview(sellerId)
  const grayColor = useThemeColor('--color-gray-600')

  const isEditable = review.status !== 'HIDDEN'

  const confirmRemove = () =>
    Alert.alert(
      'Удалить отзыв?',
      'Оценка перестанет учитываться в рейтинге продавца. Оставить новый отзыв этому продавцу можно будет позже.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить', style: 'destructive', onPress: () => remove.mutate(review.id) }
      ]
    )

  return (
    <View className='gap-2'>
      <Heading level={5}>Ваш отзыв</Heading>

      {review.status === 'PENDING' && (
        <View className='flex-row items-start gap-2 rounded-lg bg-amber-50 p-3'>
          <Clock size={16} color={AMBER_ICON_COLOR} />
          <Text className='min-w-0 flex-1 text-sm text-amber-800'>
            Отзыв на проверке: его видите только вы. После проверки модератором он появится у продавца и войдёт в
            рейтинг.
          </Text>
        </View>
      )}

      {review.status === 'HIDDEN' && (
        <View className='flex-row items-start gap-2 rounded-lg bg-gray-100 p-3'>
          <EyeOff size={16} color={grayColor} />
          <Text className='min-w-0 flex-1 text-sm text-gray-700'>
            Модератор скрыл этот отзыв: он нарушает правила площадки и в рейтинг не входит.
          </Text>
        </View>
      )}

      <ReviewCard review={review}>
        {isEditable && (
          <View className='flex-row gap-4'>
            <Pressable accessibilityRole='button' onPress={() => setIsEditing(true)} hitSlop={6}>
              <Text className='text-sm text-primary'>Изменить</Text>
            </Pressable>
            <Pressable accessibilityRole='button' disabled={remove.isPending} onPress={confirmRemove} hitSlop={6}>
              <Text className='text-sm text-gray-500'>Удалить</Text>
            </Pressable>
          </View>
        )}
      </ReviewCard>

      <ReviewFormDialog
        visible={isEditing}
        onClose={() => setIsEditing(false)}
        title='Изменить отзыв'
        initialRating={review.rating}
        initialText={review.text}
        submitLabel='Сохранить'
        isPending={update.isPending}
        onSubmit={({ rating, text }) =>
          update.mutate({ id: review.id, dto: { rating, text } }, { onSuccess: () => setIsEditing(false) })
        }
      />
    </View>
  )
}
