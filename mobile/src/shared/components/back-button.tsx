import { useRouter } from 'expo-router'
import { Pressable } from 'react-native'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ArrowLeft } from '@/shared/icons/lucide'

// «Назад» в верхней полосе страницы вкладки (объявление, продавец).
export function BackButton() {
  const router = useRouter()
  const iconColor = useThemeColor('--color-gray-950')

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel='Назад'
      // Открыли по ссылке и возвращаться некуда — на главную.
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      className='size-13 items-center justify-center'
    >
      <ArrowLeft size={20} color={iconColor} />
    </Pressable>
  )
}
