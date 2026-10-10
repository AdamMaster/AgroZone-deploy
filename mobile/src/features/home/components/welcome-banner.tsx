import { Pressable, Text, View } from 'react-native'

import { useCreateAdAction } from '@/features/ads/hooks/use-create-ad-action'

import { Button } from '@/shared/components/button'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { X } from '@/shared/icons/lucide'

import { useWelcomeBannerStore } from '../store/welcome-banner-store'

// Приветственный баннер главной — как WelcomeBanner сайта: тот же текст,
// закрывается крестиком навсегда.
export function WelcomeBanner() {
  const createAd = useCreateAdAction()
  const { dismissed, hasHydrated, dismiss } = useWelcomeBannerStore()
  const closeIconColor = useThemeColor('--color-gray-400')

  if (!hasHydrated || dismissed) return null

  return (
    <View className='mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3'>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Закрыть'
        onPress={dismiss}
        hitSlop={8}
        className='absolute top-2.5 right-2.5 z-10 rounded-md p-1'
      >
        <X size={16} color={closeIconColor} />
      </Pressable>
      <View className='gap-3 pr-6'>
        <Text className='text-sm text-gray-700 dark:text-neutral-200'>
          <Text className='font-semibold text-gray-900 dark:text-white'>AgroZone</Text> только начинает свой путь.
          Разместите объявление{' '}
          <Text className='font-semibold text-gray-900 dark:text-white'>бесплатно на весь срок публикации</Text> и
          станьте одним из первых участников{' '}
          <Text className='font-semibold text-gray-900 dark:text-white'>AgroZone</Text>.
        </Text>
      </View>
      <View className='mt-3'>
        <Button title='Разместить объявление' onPress={createAd} />
      </View>
    </View>
  )
}
