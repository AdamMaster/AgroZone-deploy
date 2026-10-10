import { Pressable } from 'react-native'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Heart } from '@/shared/icons/lucide'

interface FavoriteButtonProps {
  isFavorite: boolean
  isLoading?: boolean
  onPress: () => void
  size?: number
}

// Красный — как text-red-500 у сердечка сайта.
const FAVORITE_COLOR = '#fb2c36'

// Сердечко «в избранное» — как FavoriteButton сайта: серый контур или
// красное залитое сердце.
export function FavoriteButton({ isFavorite, isLoading = false, onPress, size = 16 }: FavoriteButtonProps) {
  const idleColor = useThemeColor('--color-gray-400')

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
      accessibilityState={{ selected: isFavorite, disabled: isLoading }}
      disabled={isLoading}
      onPress={onPress}
      hitSlop={8}
      className='size-8 items-center justify-center active:scale-95 disabled:opacity-50'
    >
      <Heart
        size={size}
        color={isFavorite ? FAVORITE_COLOR : idleColor}
        fill={isFavorite ? FAVORITE_COLOR : 'transparent'}
      />
    </Pressable>
  )
}
