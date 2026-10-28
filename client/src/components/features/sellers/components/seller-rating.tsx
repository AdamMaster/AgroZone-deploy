'use client'

import { Star } from 'lucide-react'
import Link from 'next/link'

import { useSiteFlags } from '@/components/features/site-settings/hooks'

import { pluralizeRu } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { ISellerRating } from '../types'
import { RatingStars } from './rating-stars'

export const formatReviewsCount = (count: number) => `${count} ${pluralizeRu(count, ['отзыв', 'отзыва', 'отзывов'])}`

interface SellerRatingSummaryProps {
  rating?: ISellerRating
  // Ссылка на отзывы продавца. Без неё — просто текст (например, внутри
  // блока, который сам ссылка на продавца).
  href?: string
  // Показывать «Пока нет оценок», когда среднего ещё нет (по умолчанию
  // скрыто, чтобы не загромождать места, где рейтинг — дополнение).
  showEmpty?: boolean
  className?: string
}

// Рейтинг продавца: звёзды, среднее и число отзывов. Не рисуется, пока
// рейтинги выключены в админке: сервер и так не присылает поле rating, но
// кеш страниц мог сохранить его до выключения — флаг проверяем и здесь.
export const SellerRatingSummary = ({ rating, href, showEmpty = false, className }: SellerRatingSummaryProps) => {
  const { sellerRatings } = useSiteFlags()

  if (!sellerRatings || !rating) return null

  const hasAverage = rating.average !== null

  if (!hasAverage && !showEmpty) return null

  const content = hasAverage ? (
    <>
      <RatingStars value={rating.average!} />
      <span className='font-medium text-gray-900'>{rating.average!.toFixed(1)}</span>
      <span className='text-gray-500'>· {formatReviewsCount(rating.count)}</span>
    </>
  ) : (
    <span className='text-gray-500'>Пока нет оценок</span>
  )

  const classes = cn('flex flex-wrap items-center gap-1.5 text-sm', className)

  return href ? (
    <Link href={href} className={cn(classes, 'hover:text-primary')}>
      {content}
    </Link>
  ) : (
    <div className={classes}>{content}</div>
  )
}

interface SellerRatingBadgeProps {
  rating?: ISellerRating
  className?: string
}

// Компактный рейтинг для карточек в списках: «★ 4,8 (12)». Только когда
// среднее уже есть — «Пока нет оценок» в карточке каталога ни к чему.
export const SellerRatingBadge = ({ rating, className }: SellerRatingBadgeProps) => {
  const { sellerRatings } = useSiteFlags()

  if (!sellerRatings || !rating || rating.average === null) return null

  return (
    <span
      className={cn('inline-flex items-center gap-1 text-xs text-gray-600', className)}
      title={`Рейтинг продавца: ${rating.average.toFixed(1)}, ${formatReviewsCount(rating.count)}`}
    >
      <Star className='size-3.5 fill-amber-400 text-amber-400' />
      <span className='font-medium text-gray-900'>{rating.average.toFixed(1)}</span>
      <span className='text-gray-500'>({rating.count})</span>
    </span>
  )
}
