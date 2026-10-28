import { Text, View } from 'react-native'

import { Button } from '@/shared/components/button'
import { Dialog } from '@/shared/components/dialog'
import { Skeleton } from '@/shared/components/skeleton'

import { useCreateSellerReview } from '../hooks/use-seller-review-actions'
import { useMySellerReview } from '../hooks/use-seller-reviews'
import { ReviewFormDialog } from './review-form-dialog'

interface ReviewDialogProps {
  sellerId: string
  visible: boolean
  onClose: () => void
  // Открыть отзывы продавца (страница продавца, вкладка «Отзывы») — когда
  // отзыв уже оставлен.
  onOpenSellerReviews: () => void
}

// «Оставить отзыв» прямо из чата, после того как продавец отметил сделку —
// как ReviewDialog сайта. Допуск, как и на странице продавца, решает сервер:
// если отзыв уже есть или оставить его нельзя, объясняем.
export function ReviewDialog({ sellerId, visible, onClose, onOpenSellerReviews }: ReviewDialogProps) {
  const mine = useMySellerReview(sellerId, visible)
  const create = useCreateSellerReview(sellerId)

  const eligibility = mine.data?.eligibility
  const canReview = !mine.data?.review && eligibility?.canReview

  // Форма отзыва — готовое окно со своим заголовком; пока допуск неизвестен
  // или отзыв нельзя оставить, показываем простое окно с объяснением.
  if (canReview) {
    return (
      <ReviewFormDialog
        visible={visible}
        onClose={onClose}
        title='Отзыв о продавце'
        description='Ваша оценка поможет другим покупателям.'
        submitLabel='Отправить отзыв'
        isPending={create.isPending}
        onSubmit={({ rating, text }) => create.mutate({ rating, text: text || undefined }, { onSuccess: onClose })}
      />
    )
  }

  return (
    <Dialog visible={visible} onClose={onClose} title='Отзыв о продавце'>
      {mine.isPending && <Skeleton className='h-20 rounded-xl' />}

      {mine.isError && <Text className='text-sm text-gray-500'>Не удалось проверить, можно ли оставить отзыв.</Text>}

      {mine.data?.review && (
        <View className='gap-4'>
          <Text className='text-sm text-gray-600'>Вы уже оставили отзыв этому продавцу.</Text>
          <Button
            title='Посмотреть'
            variant='outline'
            onPress={() => {
              onClose()
              onOpenSellerReviews()
            }}
          />
        </View>
      )}

      {mine.data && !mine.data.review && eligibility && !eligibility.canReview && (
        <Text className='text-sm text-gray-600'>{eligibility.message}</Text>
      )}
    </Dialog>
  )
}
