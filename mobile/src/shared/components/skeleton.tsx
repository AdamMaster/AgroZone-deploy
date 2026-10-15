import { useEffect } from 'react'
import type { StyleProp, ViewStyle } from 'react-native'
import {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated'

import { StyledAnimatedView } from './styled'

// Пульсация как animate-pulse у Tailwind на сайте: за 2 секунды прозрачность
// идёт 1 → 0.5 → 1 по кривой cubic-bezier(0.4, 0, 0.6, 1).
const PULSE_HALF_MS = 1000
const PULSE_MIN_OPACITY = 0.5
const PULSE_EASING = Easing.bezier(0.4, 0, 0.6, 1)

interface SkeletonProps {
  // Размер и скругление блока; цвет и пульсацию задаёт сам Skeleton.
  className?: string
  style?: StyleProp<ViewStyle>
}

// Серый блок-заглушка на время загрузки — Skeleton сайта. Блоки на экране
// появляются одновременно, поэтому и мерцают в такт.
export function Skeleton({ className = '', style }: SkeletonProps) {
  const reduceMotion = useReducedMotion()
  const opacity = useSharedValue(1)

  useEffect(() => {
    if (reduceMotion) return

    opacity.value = withRepeat(
      withSequence(
        withTiming(PULSE_MIN_OPACITY, { duration: PULSE_HALF_MS, easing: PULSE_EASING }),
        withTiming(1, { duration: PULSE_HALF_MS, easing: PULSE_EASING })
      ),
      -1
    )

    return () => {
      cancelAnimation(opacity)
      opacity.value = 1
    }
  }, [reduceMotion, opacity])

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))

  return <StyledAnimatedView className={`bg-skeleton ${className}`} style={[style, animatedStyle]} />
}
