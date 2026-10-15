import { useRouter } from 'expo-router'
import { Pressable } from 'react-native'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ArrowLeft } from '@/shared/icons/lucide'

interface BackButtonProps {
  // Своё действие вместо возврата на прошлый экран (например, шаг формы).
  onPress?: () => void
  label?: string
  // page — «Назад» в верхней полосе страницы, как ButtonBack сайта;
  // card — маленькая кнопка внутри серой шапки переписки.
  variant?: 'page' | 'card'
}

const VARIANT_CLASS_NAME = {
  page: 'size-13 items-center justify-center',
  card: 'size-10 items-center justify-center rounded-lg active:bg-gray-200'
} as const

// «Назад» везде выглядит одинаково: так же, как на сайте.
export function BackButton({ onPress, label = 'Назад', variant = 'page' }: BackButtonProps) {
  const router = useRouter()
  const iconColor = useThemeColor('--color-gray-950')

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={label}
      // Открыли по ссылке и возвращаться некуда — на главную.
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      className={VARIANT_CLASS_NAME[variant]}
    >
      <ArrowLeft size={20} color={iconColor} />
    </Pressable>
  )
}
