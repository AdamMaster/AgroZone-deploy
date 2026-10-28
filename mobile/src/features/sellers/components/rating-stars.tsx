import { Pressable, Text, View } from 'react-native'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Star } from '@/shared/icons/lucide'

import { RATING_LABELS } from '../constants/seller-reviews.constants'

const STARS = [1, 2, 3, 4, 5]
// amber-400 — тот же цвет закрашенной звезды, что на сайте.
const FILLED_COLOR = '#fbbf24'

interface RatingStarsProps {
  // 0–5, дробное значение закрашивает звезду частично.
  value: number
  size?: number
}

// Звёзды для показа среднего рейтинга и оценки в отзыве. Слой с цветными
// звёздами обрезается по ширине — так 4,3 выглядят как четыре с хвостиком.
export function RatingStars({ value, size = 16 }: RatingStarsProps) {
  const emptyColor = useThemeColor('--color-gray-300')
  const clamped = Math.max(0, Math.min(5, value))

  return (
    <View
      accessibilityRole='image'
      accessibilityLabel={`Оценка ${clamped.toFixed(1)} из 5`}
      style={{ width: size * STARS.length, height: size }}
    >
      <View className='flex-row'>
        {STARS.map(star => (
          <Star key={star} size={size} color={emptyColor} />
        ))}
      </View>
      <View className='absolute inset-y-0 left-0 overflow-hidden' style={{ width: clamped * size }}>
        <View className='flex-row' style={{ width: size * STARS.length }}>
          {STARS.map(star => (
            <Star key={star} size={size} color={FILLED_COLOR} fill={FILLED_COLOR} />
          ))}
        </View>
      </View>
    </View>
  )
}

interface RatingInputProps {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

// Выбор оценки в форме отзыва: пять кнопок и подпись выбранной оценки.
export function RatingInput({ value, onChange, disabled }: RatingInputProps) {
  const emptyColor = useThemeColor('--color-gray-300')

  return (
    <View className='gap-1'>
      <View accessibilityRole='radiogroup' accessibilityLabel='Оценка' className='flex-row gap-1'>
        {STARS.map(star => (
          <Pressable
            key={star}
            accessibilityRole='radio'
            accessibilityState={{ checked: value === star, disabled }}
            accessibilityLabel={`${star} из 5 — ${RATING_LABELS[star]}`}
            disabled={disabled}
            hitSlop={4}
            onPress={() => onChange(star)}
            className='active:opacity-70 disabled:opacity-50'
          >
            <Star
              size={36}
              color={star <= value ? FILLED_COLOR : emptyColor}
              fill={star <= value ? FILLED_COLOR : 'transparent'}
            />
          </Pressable>
        ))}
      </View>
      <Text className='text-sm text-gray-500'>{value ? RATING_LABELS[value] : 'Выберите оценку'}</Text>
    </View>
  )
}
