import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { useRequestSignIn } from '@/features/auth/hooks/use-request-sign-in'

import { Button } from '@/shared/components/button'
import { Dialog } from '@/shared/components/dialog'
import { Input } from '@/shared/components/input'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Flag } from '@/shared/icons/lucide'

import { SELLER_REVIEW_REPLY_MAX_LENGTH } from '../constants/seller-reviews.constants'
import { useReplySellerReview } from '../hooks/use-seller-review-actions'
import type { SellerReview } from '../types/seller-review.types'
import { ReportSellerReviewDialog } from './report-seller-review-dialog'

interface ReviewReplyButtonProps {
  review: SellerReview
  sellerId: string
}

// Ответ продавца на отзыв: один ответ, его можно отредактировать.
export function ReviewReplyButton({ review, sellerId }: ReviewReplyButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Pressable accessibilityRole='button' onPress={() => setIsOpen(true)} hitSlop={6} className='self-start'>
        <Text className='text-sm text-primary'>{review.sellerReply ? 'Изменить ответ' : 'Ответить'}</Text>
      </Pressable>
      <ReplyDialog review={review} sellerId={sellerId} visible={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

interface ReplyDialogProps extends ReviewReplyButtonProps {
  visible: boolean
  onClose: () => void
}

function ReplyDialog({ review, sellerId, visible, onClose }: ReplyDialogProps) {
  return (
    <Dialog visible={visible} onClose={onClose} title='Ответ на отзыв'>
      <ReplyForm review={review} sellerId={sellerId} onDone={onClose} />
    </Dialog>
  )
}

// Форма лежит внутри окна отдельным компонентом: при закрытии он
// размонтируется, и текст ответа каждый раз начинается с сохранённого.
function ReplyForm({ review, sellerId, onDone }: ReviewReplyButtonProps & { onDone: () => void }) {
  const [text, setText] = useState(review.sellerReply ?? '')
  const reply = useReplySellerReview(sellerId)

  return (
    <View className='gap-4'>
      <Input
        multiline
        value={text}
        onChangeText={setText}
        placeholder='Ваш ответ покупателю'
        accessibilityLabel='Ответ на отзыв'
        maxLength={SELLER_REVIEW_REPLY_MAX_LENGTH}
        editable={!reply.isPending}
      />
      <Button
        title='Опубликовать'
        disabled={!text.trim()}
        isLoading={reply.isPending}
        onPress={() => reply.mutate({ id: review.id, text: text.trim() }, { onSuccess: onDone })}
      />
    </View>
  )
}

interface ReviewReportButtonProps {
  reviewId: string
  isSignedIn: boolean
}

// «Пожаловаться на отзыв»: гостя ведём на вход, остальным открываем окно.
export function ReviewReportButton({ reviewId, isSignedIn }: ReviewReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const requestSignIn = useRequestSignIn()
  const iconColor = useThemeColor('--color-gray-500')

  return (
    <>
      <Pressable
        accessibilityRole='button'
        onPress={() => (isSignedIn ? setIsOpen(true) : requestSignIn())}
        hitSlop={6}
        className='flex-row items-center gap-1.5 self-start active:opacity-70'
      >
        <Flag size={14} color={iconColor} />
        <Text className='text-xs text-gray-500'>Пожаловаться</Text>
      </Pressable>
      {isSignedIn && <ReportSellerReviewDialog reviewId={reviewId} visible={isOpen} onClose={() => setIsOpen(false)} />}
    </>
  )
}
