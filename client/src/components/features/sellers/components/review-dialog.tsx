'use client'

import Link from 'next/link'

import { Dialog, DialogContent, DialogDescription, DialogHeader, Heading, Skeleton } from '@/components/ui'

import { useCreateSellerReview, useMySellerReview } from '../hooks'
import { ReviewForm } from './review-form'

interface ReviewDialogProps {
  sellerId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

// «Оставить отзыв» прямо из чата, после того как продавец отметил сделку.
// Допуск, как и на странице продавца, решает сервер: если отзыв уже есть
// или оставить его нельзя, объясняем и ведём на страницу продавца.
export const ReviewDialog = ({ sellerId, open, onOpenChange }: ReviewDialogProps) => {
  const mine = useMySellerReview(sellerId, open)
  const { createReview, isCreating } = useCreateSellerReview(sellerId)

  const eligibility = mine.data?.eligibility
  const sellerHref = `/sellers/${sellerId}?tab=reviews`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-md p-7'>
        <DialogHeader>
          <Heading level={4}>Отзыв о продавце</Heading>
          <DialogDescription>Ваша оценка поможет другим покупателям.</DialogDescription>
        </DialogHeader>

        {mine.isPending && <Skeleton className='h-40 rounded-xl' />}

        {mine.isError && <p className='text-sm text-gray-500'>Не удалось проверить, можно ли оставить отзыв.</p>}

        {mine.data?.review && (
          <p className='text-sm text-gray-600'>
            Вы уже оставили отзыв этому продавцу.{' '}
            <Link href={sellerHref} className='text-primary hover:underline'>
              Посмотреть
            </Link>
          </p>
        )}

        {mine.data && !mine.data.review && eligibility?.canReview && (
          <ReviewForm
            submitLabel='Отправить отзыв'
            isPending={isCreating}
            onCancel={() => onOpenChange(false)}
            onSubmit={({ rating, text }) =>
              createReview({ rating, text: text || undefined }, { onSuccess: () => onOpenChange(false) })
            }
          />
        )}

        {mine.data && !mine.data.review && eligibility && !eligibility.canReview && (
          <p className='text-sm text-gray-600'>{eligibility.message}</p>
        )}
      </DialogContent>
    </Dialog>
  )
}
