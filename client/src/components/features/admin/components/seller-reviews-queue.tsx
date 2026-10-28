'use client'

import Link from 'next/link'

import { Button } from '@/components/ui'

import { SELLER_REVIEW_REPORT_REASON_LABELS } from '@/shared/constants/seller-review-report-reasons'

import { ADMIN_BUTTON_CLASS } from '../constants/admin-ui.constants'
import {
  SELLER_REVIEW_CONTACT_TYPE_LABELS,
  SELLER_REVIEW_FILTER_FLAG_LABELS,
  SELLER_REVIEW_STATUS_LABELS
} from '../constants/seller-review-moderation.constants'
import { useAdminSellerReviews, useModerateSellerReview } from '../hooks'
import {
  ISellerReviewModerationItem,
  ISellerReviewModerationUser,
  SellerReviewModerationDecision
} from '../types/admin.types'

const userLabel = (user: ISellerReviewModerationUser) =>
  user.deletedAt ? 'Удалённый аккаунт' : (user.displayName ?? user.email ?? 'Пользователь')

const UserLink = ({ user }: { user: ISellerReviewModerationUser }) => (
  <Link href={`/admin/users/${user.id}`} className='hover:text-primary underline-offset-2 hover:underline'>
    {userLabel(user)}
  </Link>
)

export const SellerReviewsQueue = () => {
  const { reviews, total, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useAdminSellerReviews()
  const { moderateSellerReview, isModerating } = useModerateSellerReview()

  const renderReview = (review: ISellerReviewModerationItem) => (
    <div key={review.id} className='flex items-start gap-4 rounded-md bg-mist-600/50 p-3'>
      <div className='min-w-0 flex-1'>
        <div className='mb-1 flex flex-wrap items-center gap-2'>
          <span className='font-medium'>Оценка: {review.rating} из 5</span>
          <span className='rounded-full bg-amber-200 px-1.5 text-[11px] text-mist-950'>
            {SELLER_REVIEW_STATUS_LABELS[review.status]}
          </span>
          <span className='text-xs text-mist-400'>{SELLER_REVIEW_CONTACT_TYPE_LABELS[review.contactType]}</span>
        </div>

        {review.text ? (
          <p className='rounded-sm bg-mist-600/60 p-2 text-sm break-words whitespace-pre-line'>{review.text}</p>
        ) : (
          <p className='text-sm text-mist-400'>Без текста</p>
        )}

        {review.filterFlags.length > 0 && (
          <p className='mt-2 text-sm text-red-400'>
            Автофильтр: {review.filterFlags.map(flag => SELLER_REVIEW_FILTER_FLAG_LABELS[flag]).join(', ')}
          </p>
        )}

        {review.reports.length > 0 && (
          <div className='mt-2 flex flex-col gap-1'>
            <p className='text-sm text-red-400'>Жалоб: {review.reports.length}</p>
            {review.reports.map(report => (
              <p key={report.id} className='rounded-sm bg-mist-600/60 p-2 text-sm'>
                <span className='font-medium'>{SELLER_REVIEW_REPORT_REASON_LABELS[report.reason]}</span>
                {report.comment && <span> — {report.comment}</span>}
                <span className='block text-xs text-mist-400'>
                  {userLabel({ ...report.reporter, email: null, deletedAt: null })}
                </span>
              </p>
            ))}
          </div>
        )}

        <p className='mt-4 text-xs text-mist-400'>
          Автор: <UserLink user={review.author} /> · Продавец: <UserLink user={review.seller} /> ·{' '}
          {new Date(review.createdAt).toLocaleString('ru-RU')}
        </p>
      </div>

      <div className='flex shrink-0 gap-1'>
        <Button
          size='sm'
          className={ADMIN_BUTTON_CLASS}
          disabled={isModerating}
          onClick={() => moderateSellerReview({ id: review.id, decision: SellerReviewModerationDecision.Publish })}
        >
          Опубликовать
        </Button>
        <Button
          size='sm'
          className={ADMIN_BUTTON_CLASS}
          disabled={isModerating}
          onClick={() => moderateSellerReview({ id: review.id, decision: SellerReviewModerationDecision.Hide })}
        >
          Скрыть
        </Button>
      </div>
    </div>
  )

  return (
    <div className='py-6 text-mist-50'>
      {isLoading && <p className='text-sm'>Загрузка...</p>}

      {!isLoading && reviews.length === 0 && <p className='text-sm'>Нечего проверять — очередь пуста.</p>}

      {reviews.length > 0 && <p className='mb-3 text-sm text-mist-300'>В очереди: {total}</p>}

      <div className='flex flex-col gap-2'>{reviews.map(renderReview)}</div>

      {hasNextPage && (
        <Button className={`${ADMIN_BUTTON_CLASS} mt-4`} disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
          {isFetchingNextPage ? 'Загружаем...' : 'Показать ещё'}
        </Button>
      )}
    </div>
  )
}
