'use client'

import Link from 'next/link'

import { useSiteFlags } from '@/components/features/site-settings/hooks'

import { cn } from '@/lib/utils'

import { IOwnSellerRating } from '../types'
import { RatingStars } from './rating-stars'
import { formatReviewsCount } from './seller-rating'

interface OwnSellerRatingProps {
  userId: string
  rating?: IOwnSellerRating
  // Пояснение «другие увидят рейтинг после N отзывов» — для просторных мест
  // (страница «Личные данные»); в узком меню его не показываем.
  showHint?: boolean
  onNavigate?: () => void
  className?: string
}

// Свой рейтинг в кабинете, как «5,0 ★★★★★ 5 отзывов» в меню профиля у
// Авито: ссылка на вкладку «Отзывы» собственной публичной страницы. Владелец
// видит среднее сразу, а не после порога, поэтому здесь отдельный компонент,
// а не публичный SellerRatingSummary.
export const OwnSellerRating = ({ userId, rating, showHint = false, onNavigate, className }: OwnSellerRatingProps) => {
  const { sellerRatings } = useSiteFlags()

  if (!sellerRatings || !rating) return null

  const hasAverage = rating.average !== null

  return (
    <div className={className}>
      <Link
        href={`/sellers/${userId}?tab=reviews`}
        onClick={onNavigate}
        className={cn('flex flex-wrap items-center gap-1.5 text-sm text-gray-500')}
      >
        {hasAverage ? (
          <>
            <span className='font-medium text-gray-900'>{rating.average!.toFixed(1)}</span>
            <RatingStars value={rating.average!} />
            <span className='text-gray-900'>{formatReviewsCount(rating.count)}</span>
          </>
        ) : (
          <span className='text-gray-500'>Пока нет отзывов</span>
        )}
      </Link>
      {showHint && !rating.isPublic && (
        <p className='mt-1 text-xs text-gray-500'>
          {hasAverage
            ? 'Другие пользователи пока не видят этот рейтинг: он появится, когда наберётся достаточно отзывов.'
            : 'Рейтинг появится после первого отзыва.'}
        </p>
      )}
    </div>
  )
}
