'use client'

import { useAppModal } from '@/store'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button, Heading, Skeleton } from '@/components/ui'

import { useProfile } from '@/shared/hooks'

import { SELLER_RATING_MIN_REVIEWS_TO_SHOW } from '../constants/seller-reviews.constants'
import { useCreateSellerReview, useMySellerReview, useSellerReviews } from '../hooks'
import { ISellerReviewEligibility, SellerReviewBlockReason } from '../types'
import { MySellerReview } from './my-seller-review'
import { RatingStars } from './rating-stars'
import { ReviewReply, ReviewReportButton } from './review-actions'
import { ReviewCard } from './review-card'
import { ReviewForm } from './review-form'
import { formatReviewsCount } from './seller-rating'

// Причины, по которым пользователю стоит объяснить, почему отзыв пока
// нельзя оставить. Остальные (сам себе, блокировка, уже оставил) молчим: либо
// это не о чем сообщать, либо отзыв уже показан выше.
const EXPLAINED_REASONS: SellerReviewBlockReason[] = [
  SellerReviewBlockReason.NoContact,
  SellerReviewBlockReason.ContactTooFresh,
  SellerReviewBlockReason.AccountTooYoung,
  SellerReviewBlockReason.DailyLimit
]

interface SellerReviewsProps {
  sellerId: string
}

// Вкладка «Отзывы» на странице продавца: итог рейтинга, свой отзыв или
// форма, список отзывов с «Показать ещё». Рисуется только при включённых
// рейтингах (см. SellerProfileTabs).
export const SellerReviews = ({ sellerId }: SellerReviewsProps) => {
  const { user, isLoading: isProfileLoading } = useProfile()
  const { onOpen } = useAppModal()
  const [isFormOpen, setIsFormOpen] = useState(false)

  const isOwner = user?.id === sellerId
  const { reviews, rating, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } =
    useSellerReviews(sellerId)
  const mine = useMySellerReview(sellerId, !!user && !isOwner)
  const { createReview, isCreating } = useCreateSellerReview(sellerId)

  const myReview = mine.data?.review ?? null
  // Свой отзыв показываем отдельным блоком, из общего списка его убираем.
  const otherReviews = myReview ? reviews.filter(review => review.id !== myReview.id) : reviews
  const eligibility: ISellerReviewEligibility | undefined = mine.data?.eligibility

  return (
    <div className='flex flex-col gap-6'>
      <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
        {rating?.average != null ? (
          <>
            <span className='text-4xl font-semibold'>{rating.average.toFixed(1).replace('.', ',')}</span>
            <div className='flex flex-col gap-1'>
              <RatingStars value={rating.average} starClassName='size-5' />
              <span className='text-sm text-gray-500'>{formatReviewsCount(rating.count)}</span>
            </div>
          </>
        ) : (
          <div>
            <Heading level={4}>Пока нет оценок</Heading>
            <p className='text-sm text-gray-500'>
              Рейтинг появится, когда у продавца будет не меньше {SELLER_RATING_MIN_REVIEWS_TO_SHOW} отзывов.
            </p>
          </div>
        )}
      </div>

      {!isOwner && (
        <ReviewAccess
          isAuthorized={!!user}
          isLoading={isProfileLoading || (!!user && mine.isPending)}
          isFormOpen={isFormOpen}
          eligibility={eligibility}
          hasReview={!!myReview}
          isCreating={isCreating}
          onOpenForm={() => setIsFormOpen(true)}
          onCloseForm={() => setIsFormOpen(false)}
          onLogin={() => onOpen('login')}
          onSubmit={({ rating: value, text }) =>
            createReview({ rating: value, text: text || undefined }, { onSuccess: () => setIsFormOpen(false) })
          }
        />
      )}

      {myReview && <MySellerReview review={myReview} sellerId={sellerId} />}

      <section aria-label='Отзывы покупателей' className='flex flex-col gap-3'>
        {isLoading && (
          <>
            <Skeleton className='h-28 rounded-xl' />
            <Skeleton className='h-28 rounded-xl' />
          </>
        )}

        {isError && (
          <p className='text-sm text-gray-500'>
            Не удалось загрузить отзывы.{' '}
            <button type='button' className='text-primary hover:underline' onClick={() => refetch()}>
              Повторить
            </button>
          </p>
        )}

        {!isLoading && !isError && otherReviews.length === 0 && !myReview && (
          <p className='text-sm text-gray-500'>Отзывов пока нет.</p>
        )}

        {otherReviews.map(review => (
          <ReviewCard key={review.id} review={review}>
            <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
              {isOwner && <ReviewReply review={review} sellerId={sellerId} />}
              {review.author.id !== user?.id && <ReviewReportButton reviewId={review.id} isAuthorized={!!user} />}
            </div>
          </ReviewCard>
        ))}

        {hasNextPage && (
          <div className='flex justify-center'>
            <Button variant='outline' size='lg' disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
              {isFetchingNextPage ? (
                <>
                  <Loader2 className='size-4 animate-spin' />
                  Загружаем...
                </>
              ) : (
                'Показать ещё'
              )}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

interface ReviewAccessProps {
  isAuthorized: boolean
  isLoading: boolean
  isFormOpen: boolean
  eligibility?: ISellerReviewEligibility
  hasReview: boolean
  isCreating: boolean
  onOpenForm: () => void
  onCloseForm: () => void
  onLogin: () => void
  onSubmit: (values: { rating: number; text: string }) => void
}

// Что показать вместо формы или вместе с ней: приглашение войти, кнопку
// «Оставить отзыв», форму или объяснение, почему отзыв пока нельзя
// оставить. Допуск считает сервер, мы его только показываем.
const ReviewAccess = ({
  isAuthorized,
  isLoading,
  isFormOpen,
  eligibility,
  hasReview,
  isCreating,
  onOpenForm,
  onCloseForm,
  onLogin,
  onSubmit
}: ReviewAccessProps) => {
  // Пока неизвестно, вошёл ли пользователь (или идёт проверка допуска),
  // показываем заглушку, а не приглашение войти: вошедший его не должен видеть.
  if (isLoading) return <Skeleton className='h-14 rounded-xl' />

  if (!isAuthorized) {
    return (
      <div className='flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 p-4'>
        <p className='flex-1 text-sm text-gray-600'>Отзыв может оставить покупатель, который связывался с продавцом.</p>
        <Button variant='outline' onClick={onLogin}>
          Войти, чтобы оставить отзыв
        </Button>
      </div>
    )
  }

  if (hasReview || !eligibility) return null

  if (eligibility.canReview) {
    return isFormOpen ? (
      <div className='rounded-xl border p-4'>
        <Heading level={5} className='mb-3'>
          Ваш отзыв о продавце
        </Heading>
        <ReviewForm submitLabel='Отправить отзыв' isPending={isCreating} onCancel={onCloseForm} onSubmit={onSubmit} />
      </div>
    ) : (
      <div>
        <Button size='lg' onClick={onOpenForm}>
          Оставить отзыв
        </Button>
      </div>
    )
  }

  if (!EXPLAINED_REASONS.includes(eligibility.reason)) return null

  return <p className='rounded-xl bg-gray-50 p-4 text-sm text-gray-600'>{eligibility.message}</p>
}
