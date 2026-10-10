import { Image } from 'expo-image'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

interface ZoomableImageProps {
  uri: string
  width: number
  height: number
  // Увеличено ли фото — пока да, листать соседние фото нельзя: палец
  // двигает увеличенное фото.
  onZoomChange: (isZoomed: boolean) => void
  accessibilityLabel: string
}

const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2.5

const clamp = (value: number, min: number, max: number) => {
  'worklet'
  return Math.min(Math.max(value, min), max)
}

// Фото на весь экран с увеличением щипком и двойным касанием и
// перетаскиванием увеличенного фото — как Zoom у лайтбокса сайта.
export function ZoomableImage({ uri, width, height, onZoomChange, accessibilityLabel }: ZoomableImageProps) {
  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const savedTranslateX = useSharedValue(0)
  const savedTranslateY = useSharedValue(0)

  // Насколько увеличенное фото может уйти в сторону, не открывая пустоту
  // за краем экрана.
  const clampTranslation = (value: number, size: number, currentScale: number) => {
    'worklet'
    const limit = (size * currentScale - size) / 2
    return clamp(value, -limit, limit)
  }

  const reset = () => {
    'worklet'
    scale.value = withTiming(1)
    savedScale.value = 1
    translateX.value = withTiming(0)
    translateY.value = withTiming(0)
    savedTranslateX.value = 0
    savedTranslateY.value = 0
    scheduleOnRN(onZoomChange, false)
  }

  const pinch = Gesture.Pinch()
    .onUpdate(event => {
      scale.value = clamp(savedScale.value * event.scale, 1, MAX_SCALE)
    })
    .onEnd(() => {
      if (scale.value <= 1.01) {
        reset()
        return
      }

      savedScale.value = scale.value
      translateX.value = withTiming(clampTranslation(translateX.value, width, scale.value))
      translateY.value = withTiming(clampTranslation(translateY.value, height, scale.value))
      savedTranslateX.value = translateX.value
      savedTranslateY.value = translateY.value
      scheduleOnRN(onZoomChange, true)
    })

  // Перетаскивание — только увеличенного фото; у обычного горизонтальный
  // жест достаётся листанию.
  const pan = Gesture.Pan()
    .averageTouches(true)
    .manualActivation(true)
    .onTouchesMove((_event, manager) => {
      if (savedScale.value > 1) manager.activate()
      else manager.fail()
    })
    .onUpdate(event => {
      translateX.value = clampTranslation(savedTranslateX.value + event.translationX, width, scale.value)
      translateY.value = clampTranslation(savedTranslateY.value + event.translationY, height, scale.value)
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value
      savedTranslateY.value = translateY.value
    })

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(event => {
      if (savedScale.value > 1) {
        reset()
        return
      }

      // Увеличиваем к точке касания.
      const nextX = clampTranslation((width / 2 - event.x) * (DOUBLE_TAP_SCALE - 1), width, DOUBLE_TAP_SCALE)
      const nextY = clampTranslation((height / 2 - event.y) * (DOUBLE_TAP_SCALE - 1), height, DOUBLE_TAP_SCALE)

      scale.value = withTiming(DOUBLE_TAP_SCALE)
      savedScale.value = DOUBLE_TAP_SCALE
      translateX.value = withTiming(nextX)
      translateY.value = withTiming(nextY)
      savedTranslateX.value = nextX
      savedTranslateY.value = nextY
      scheduleOnRN(onZoomChange, true)
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }]
  }))

  return (
    <GestureDetector gesture={Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan))}>
      <Animated.View style={[{ width, height }, animatedStyle]}>
        <Image
          source={{ uri }}
          style={{ width, height }}
          contentFit='contain'
          accessibilityLabel={accessibilityLabel}
        />
      </Animated.View>
    </GestureDetector>
  )
}
