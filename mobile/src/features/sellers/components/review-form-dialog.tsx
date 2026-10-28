import { useState } from 'react'
import { Text, View } from 'react-native'

import { Button } from '@/shared/components/button'
import { Dialog } from '@/shared/components/dialog'
import { Input } from '@/shared/components/input'

import { SELLER_REVIEW_TEXT_MAX_LENGTH } from '../constants/seller-reviews.constants'
import { RatingInput } from './rating-stars'

interface ReviewFormDialogProps {
  visible: boolean
  onClose: () => void
  title: string
  description?: string
  initialRating?: number
  initialText?: string | null
  submitLabel: string
  isPending: boolean
  onSubmit: (values: { rating: number; text: string }) => void
}

// Окно с формой отзыва — для нового отзыва и для правки своего. Оценка
// обязательна, текст нет. Форма лежит внутри окна отдельным компонентом: при
// закрытии он размонтируется, и следующий отзыв начинается с чистой формы.
export function ReviewFormDialog({ visible, onClose, title, description, ...formProps }: ReviewFormDialogProps) {
  return (
    <Dialog visible={visible} onClose={onClose} title={title} description={description}>
      <ReviewForm {...formProps} />
    </Dialog>
  )
}

function ReviewForm({
  initialRating = 0,
  initialText,
  submitLabel,
  isPending,
  onSubmit
}: Pick<ReviewFormDialogProps, 'initialRating' | 'initialText' | 'submitLabel' | 'isPending' | 'onSubmit'>) {
  const [rating, setRating] = useState(initialRating)
  const [text, setText] = useState(initialText ?? '')

  return (
    <View className='gap-4'>
      <RatingInput value={rating} onChange={setRating} disabled={isPending} />

      <View>
        <Input
          multiline
          value={text}
          onChangeText={setText}
          placeholder='Расскажите, как всё прошло (необязательно)'
          accessibilityLabel='Текст отзыва'
          maxLength={SELLER_REVIEW_TEXT_MAX_LENGTH}
          editable={!isPending}
        />
        <Text className='mt-1 text-right text-xs text-gray-400'>
          {text.length}/{SELLER_REVIEW_TEXT_MAX_LENGTH}
        </Text>
      </View>

      <Button
        title={submitLabel}
        disabled={!rating}
        isLoading={isPending}
        onPress={() => onSubmit({ rating, text: text.trim() })}
      />
    </View>
  )
}
