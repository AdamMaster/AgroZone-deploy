import { useEffect } from 'react'
import { Pressable, Text } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { Plus } from '@/shared/icons/lucide'

interface CreateAdFabProps {
  visible: boolean
  onPress: () => void
}

// На сколько уезжает вниз спрятанная кнопка — как translate-y-20 сайта.
const HIDDEN_OFFSET = 80
const ANIMATION_MS = 300

// Плавающая «Разместить объявление» над нижней панелью — как на сайте:
// прячется при прокрутке вниз, чтобы не закрывать объявления, и
// возвращается при прокрутке вверх.
export function CreateAdFab({ visible, onPress }: CreateAdFabProps) {
  const progress = useSharedValue(visible ? 1 : 0)

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: ANIMATION_MS })
  }, [visible, progress])

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * HIDDEN_OFFSET }]
  }))

  return (
    <Animated.View
      style={[{ position: 'absolute', right: 16, bottom: 16 }, animatedStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Разместить объявление'
        onPress={onPress}
        className='h-12 flex-row items-center gap-3 rounded-lg bg-secondary px-5 shadow-lg active:opacity-90'
      >
        <Text className='text-sm font-medium text-white'>Разместить объявление</Text>
        <Plus size={20} color='#ffffff' />
      </Pressable>
    </Animated.View>
  )
}
