'use client'

import { Clock, EyeOff } from 'lucide-react'
import { useState } from 'react'

import { Button, Dialog, DialogContent, DialogDescription, DialogHeader, Heading } from '@/components/ui'

import { useRemoveSellerReview, useUpdateSellerReview } from '../hooks'
import { ISellerReview, SellerReviewStatus } from '../types'
import { ReviewCard } from './review-card'
import { ReviewForm } from './review-form'

interface MySellerReviewProps {
  review: ISellerReview
  sellerId: string
}

// Свой отзыв автора: правка, удаление и пометка статуса. «На проверке» —
// отзыв виден только автору, пока его не проверит модератор; скрытый
// модератором не правится и в рейтинг не входит.
export const MySellerReview = ({ review, sellerId }: MySellerReviewProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const { updateReview, isUpdating } = useUpdateSellerReview(sellerId)
  const { removeReview, isRemoving } = useRemoveSellerReview(sellerId)

  const isEditable = review.status !== SellerReviewStatus.Hidden

  return (
    <section aria-label='Ваш отзыв' className='flex flex-col gap-2'>
      <Heading level={5}>Ваш отзыв</Heading>

      {review.status === SellerReviewStatus.Pending && (
        <p className='flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800'>
          <Clock className='mt-0.5 size-4 shrink-0' />
          Отзыв на проверке: его видите только вы. После проверки модератором он появится у продавца и войдёт в рейтинг.
        </p>
      )}

      {review.status === SellerReviewStatus.Hidden && (
        <p className='flex items-start gap-2 rounded-lg bg-gray-100 p-3 text-sm text-gray-700'>
          <EyeOff className='mt-0.5 size-4 shrink-0' />
          Модератор скрыл этот отзыв: он нарушает правила площадки и в рейтинг не входит.
        </p>
      )}

      {isEditing ? (
        <div className='rounded-xl border p-4'>
          <ReviewForm
            initialRating={review.rating}
            initialText={review.text}
            submitLabel='Сохранить'
            isPending={isUpdating}
            onCancel={() => setIsEditing(false)}
            onSubmit={({ rating, text }) =>
              updateReview({ id: review.id, dto: { rating, text } }, { onSuccess: () => setIsEditing(false) })
            }
          />
        </div>
      ) : (
        <ReviewCard review={review}>
          {isEditable && (
            <div className='flex gap-4 text-sm'>
              <button type='button' className='text-primary hover:underline' onClick={() => setIsEditing(true)}>
                Изменить
              </button>
              <button type='button' className='text-gray-500 hover:text-red-600' onClick={() => setIsDeleteOpen(true)}>
                Удалить
              </button>
            </div>
          )}
        </ReviewCard>
      )}

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className='max-w-100 p-7'>
          <DialogHeader>
            <Heading level={4}>Удалить отзыв?</Heading>
            <DialogDescription>
              Оценка перестанет учитываться в рейтинге продавца. Оставить новый отзыв этому продавцу можно будет позже.
            </DialogDescription>
          </DialogHeader>
          <div className='flex gap-2'>
            <Button
              variant='destructive'
              disabled={isRemoving}
              onClick={() => removeReview(review.id, { onSuccess: () => setIsDeleteOpen(false) })}
            >
              Удалить
            </Button>
            <Button variant='ghost' disabled={isRemoving} onClick={() => setIsDeleteOpen(false)}>
              Отмена
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  )
}
