'use client'

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
      <span className='font-medium text-gray-900'>{rating.average!.toFixed(1)}</span>
      <RatingStars value={rating.average!} />
      <span className='text-ggray-900 ml-1'> {formatReviewsCount(rating.count)}</span>
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
