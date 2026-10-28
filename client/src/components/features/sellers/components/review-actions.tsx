'use client'

import { useAppModal } from '@/store'
import { Flag } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui'
import { Textarea } from '@/components/ui/textarea'

import { SELLER_REVIEW_REPLY_MAX_LENGTH } from '../constants/seller-reviews.constants'
import { useReplySellerReview } from '../hooks'
import { ISellerReview } from '../types'
import { ReportSellerReviewDialog } from './report-seller-review-dialog'

interface ReviewReplyProps {
  review: ISellerReview
  sellerId: string
}

// Ответ продавца на отзыв: один ответ, его можно отредактировать.
export const ReviewReply = ({ review, sellerId }: ReviewReplyProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [text, setText] = useState(review.sellerReply ?? '')
  const { replyReview, isReplying } = useReplySellerReview(sellerId)

  if (!isOpen) {
    return (
      <button type='button' className='text-primary w-fit text-sm hover:underline' onClick={() => setIsOpen(true)}>
        {review.sellerReply ? 'Изменить ответ' : 'Ответить'}
      </button>
    )
  }

  return (
    <form
      className='flex flex-col gap-2'
      onSubmit={event => {
        event.preventDefault()
        replyReview({ id: review.id, text: text.trim() }, { onSuccess: () => setIsOpen(false) })
      }}
    >
      <Textarea
        value={text}
        onChange={event => setText(event.target.value)}
        placeholder='Ваш ответ покупателю'
        rows={3}
        maxLength={SELLER_REVIEW_REPLY_MAX_LENGTH}
        disabled={isReplying}
        className='resize-none'
      />
      <div className='flex gap-2'>
        <Button type='submit' size='sm' disabled={!text.trim() || isReplying}>
          Опубликовать
        </Button>
        <Button type='button' size='sm' variant='ghost' disabled={isReplying} onClick={() => setIsOpen(false)}>
          Отмена
        </Button>
      </div>
    </form>
  )
}

interface ReviewReportButtonProps {
  reviewId: string
  isAuthorized: boolean
}

// «Пожаловаться на отзыв»: гостя ведём на вход, остальным открываем окно.
export const ReviewReportButton = ({ reviewId, isAuthorized }: ReviewReportButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const { onOpen } = useAppModal()

  return (
    <>
      <button
        type='button'
        className='flex w-fit items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700'
        onClick={() => (isAuthorized ? setIsOpen(true) : onOpen('login'))}
      >
        <Flag className='size-3.5' />
        Пожаловаться
      </button>
      {isAuthorized && <ReportSellerReviewDialog reviewId={reviewId} open={isOpen} onOpenChange={setIsOpen} />}
    </>
  )
}
