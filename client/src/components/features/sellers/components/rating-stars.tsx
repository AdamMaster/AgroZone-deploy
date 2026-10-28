'use client'

import { Star } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/lib/utils'

import { RATING_LABELS } from '../constants/seller-reviews.constants'

const STARS = [1, 2, 3, 4, 5]

interface RatingStarsProps {
  // 0–5, дробное значение закрашивает звезду частично.
  value: number
  className?: string
  starClassName?: string
}

// Звёзды для показа среднего рейтинга и оценки в отзыве. Слой с цветными
// звёздами обрезается по ширине — так 4,3 выглядят как четыре с хвостиком.
export const RatingStars = ({ value, className, starClassName = 'size-4' }: RatingStarsProps) => {
  const clamped = Math.max(0, Math.min(5, value))

  return (
    <span role='img' aria-label={`Оценка ${clamped.toFixed(1)} из 5`} className={cn('relative inline-flex', className)}>
      <span className='flex'>
        {STARS.map(star => (
          <Star key={star} className={cn('shrink-0 fill-gray-300 text-gray-300', starClassName)} />
        ))}
      </span>
      <span className='absolute inset-y-0 left-0 flex overflow-hidden' style={{ width: `${(clamped / 5) * 100}%` }}>
        {STARS.map(star => (
          <Star key={star} className={cn('shrink-0 fill-amber-400 text-amber-400', starClassName)} />
        ))}
      </span>
    </span>
  )
}

interface RatingInputProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

// Выбор оценки в форме отзыва: пять кнопок, подсветка при наведении, подпись
// выбранной оценки рядом.
export const RatingInput = ({ value, onChange, disabled }: RatingInputProps) => {
  const [hovered, setHovered] = useState(0)
  const shown = hovered || value

  return (
    <div role='radiogroup' aria-label='Оценка' className='flex items-center gap-1' onMouseLeave={() => setHovered(0)}>
      {STARS.map(star => (
        <button
          key={star}
          type='button'
          role='radio'
          aria-checked={value === star}
          aria-label={`${star} из 5 — ${RATING_LABELS[star]}`}
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          className='rounded p-0.5 transition-transform hover:scale-110 disabled:pointer-events-none disabled:opacity-50'
        >
          <Star
            className={cn(
              'size-8 transition-colors',
              star <= shown ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
            )}
          />
        </button>
      ))}
      <span className='ml-2 text-sm text-gray-500'>{shown ? RATING_LABELS[shown] : 'Выберите оценку'}</span>
    </div>
  )
}
