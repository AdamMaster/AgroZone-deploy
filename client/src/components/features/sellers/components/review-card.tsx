import { CircleCheck } from 'lucide-react'
import { ReactNode } from 'react'

import { UserAvatar } from '@/components/features/user/components'

import { formatFullDate } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { ISellerReview, SellerReviewContactType } from '../types'
import { RatingStars } from './rating-stars'

interface ReviewCardProps {
  review: ISellerReview
  // Действия под отзывом (ответить, пожаловаться, изменить и т. п.).
  children?: ReactNode
  className?: string
}

// Один отзыв: автор, оценка, значок основания («Сделка подтверждена» /
// «Не подтверждено продавцом»), текст и ответ продавца.
export const ReviewCard = ({ review, children, className }: ReviewCardProps) => {
  const isDeleted = !!review.author.deletedAt
  const isDealConfirmed = review.contactType === SellerReviewContactType.DealConfirmed

  return (
    <article className={cn('flex flex-col gap-3 rounded-xl border p-4', className)}>
      <header className='flex items-center gap-3'>
        <UserAvatar user={review.author} className='size-10' />
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-medium'>
            {isDeleted ? 'Удалённый пользователь' : (review.author.displayName ?? 'Пользователь')}
          </p>
          <p className='text-xs text-gray-500'>{formatFullDate(review.createdAt)}</p>
        </div>
      </header>

      <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
        <RatingStars value={review.rating} />
        {isDealConfirmed ? (
          <span className='text-primary flex items-center gap-1 text-xs'>
            <CircleCheck className='size-3.5' />
            Сделка подтверждена
          </span>
        ) : (
          <span className='text-xs text-gray-500'>Не подтверждено продавцом</span>
        )}
      </div>

      {review.text && <p className='text-sm break-words whitespace-pre-line'>{review.text}</p>}

      {review.sellerReply && (
        <div className='rounded-lg bg-gray-50 p-3'>
          <p className='mb-1 text-xs text-gray-500'>
            Ответ продавца{review.sellerReplyAt && ` · ${formatFullDate(review.sellerReplyAt)}`}
          </p>
          <p className='text-sm break-words whitespace-pre-line'>{review.sellerReply}</p>
        </div>
      )}

      {children}
    </article>
  )
}
