'use client'

import { useState } from 'react'

import { Button } from '@/components/ui'
import { Textarea } from '@/components/ui/textarea'

import { SELLER_REVIEW_TEXT_MAX_LENGTH } from '../constants/seller-reviews.constants'
import { RatingInput } from './rating-stars'

interface ReviewFormProps {
  initialRating?: number
  initialText?: string | null
  submitLabel: string
  isPending: boolean
  onSubmit: (values: { rating: number; text: string }) => void
  onCancel?: () => void
}

// Форма отзыва — для нового отзыва и для правки своего. Оценка обязательна,
// текст нет.
export const ReviewForm = ({
  initialRating = 0,
  initialText,
  submitLabel,
  isPending,
  onSubmit,
  onCancel
}: ReviewFormProps) => {
  const [rating, setRating] = useState(initialRating)
  const [text, setText] = useState(initialText ?? '')

  return (
    <form
      className='flex flex-col gap-3'
      onSubmit={event => {
        event.preventDefault()
        if (rating) onSubmit({ rating, text: text.trim() })
      }}
    >
      <RatingInput value={rating} onChange={setRating} disabled={isPending} />

      <div>
        <Textarea
          value={text}
          onChange={event => setText(event.target.value)}
          placeholder='Расскажите, как всё прошло (необязательно)'
          rows={4}
          maxLength={SELLER_REVIEW_TEXT_MAX_LENGTH}
          disabled={isPending}
          className='resize-none'
        />
        <p className='mt-1 text-right text-xs text-gray-400'>
          {text.length}/{SELLER_REVIEW_TEXT_MAX_LENGTH}
        </p>
      </div>

      <div className='flex flex-wrap gap-2'>
        <Button type='submit' disabled={!rating || isPending}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type='button' variant='ghost' disabled={isPending} onClick={onCancel}>
            Отмена
          </Button>
        )}
      </div>
    </form>
  )
}
