import { Image } from 'expo-image'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, { type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

import { photoUrl } from '@/shared/utils/photo-variants'

interface ZoomableImageProps {
  uri: string
  width: number
  height: number
  // Увеличено ли фото — пока да, листать соседние фото нельзя: палец
  // двигает увеличенное фото.
  onZoomChange: (isZoomed: boolean) => void
  // Смещение фото по вертикали при закрытии свайпом — лайтбокс по нему
  // гасит фон.
  dragY: SharedValue<number>
  // Фото смахнули вверх или вниз — лайтбокс нужно закрыть.
  onDismiss: () => void
  accessibilityLabel: string
}

const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2.5
// Закрытие свайпом: сдвиг дальше этого порога (px) или быстрый бросок (px/с).
const DISMISS_DISTANCE = 120
const DISMISS_VELOCITY = 800
// Сдвиг (px), после которого жест считается намеренным, а не дрожанием пальца.
const DRAG_SLOP = 10

const clamp = (value: number, min: number, max: number) => {
  'worklet'
  return Math.min(Math.max(value, min), max)
}

// Фото на весь экран (оригинал — для увеличения нужна вся детализация) с увеличением щипком и двойным касанием и
// перетаскиванием увеличенного фото — как Zoom у лайтбокса сайта.
export function ZoomableImage({
  uri,
  width,
  height,
  onZoomChange,
  dragY,
  onDismiss,
  accessibilityLabel
}: ZoomableImageProps) {
  const scale = useSharedValue(1)
  const savedScale = useSharedValue(1)
  const translateX = useSharedValue(0)
  const translateY = useSharedValue(0)
  const savedTranslateX = useSharedValue(0)
  const savedTranslateY = useSharedValue(0)
  const touchStartX = useSharedValue(0)
  const touchStartY = useSharedValue(0)

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

  // Увеличенное фото перетаскивается во все стороны. Обычное: горизонтальный
  // жест достаётся листанию, а вертикальный смахивает фото — закрывает
  // лайтбокс, как в галереях Авито и Telegram.
  const pan = Gesture.Pan()
    .averageTouches(true)
    .manualActivation(true)
    .onTouchesDown(event => {
      const touch = event.allTouches[0]
      touchStartX.value = touch?.x ?? 0
      touchStartY.value = touch?.y ?? 0
    })
    .onTouchesMove((event, manager) => {
      if (savedScale.value > 1) {
        manager.activate()
        return
      }

      const touch = event.allTouches[0]
      if (!touch || event.numberOfTouches > 1) {
        manager.fail()
        return
      }

      const dx = Math.abs(touch.x - touchStartX.value)
      const dy = Math.abs(touch.y - touchStartY.value)

      if (dy > DRAG_SLOP && dy > dx * 1.5) manager.activate()
      else if (dx > DRAG_SLOP) manager.fail()
    })
    .onUpdate(event => {
      if (savedScale.value > 1) {
        translateX.value = clampTranslation(savedTranslateX.value + event.translationX, width, scale.value)
        translateY.value = clampTranslation(savedTranslateY.value + event.translationY, height, scale.value)
        return
      }

      translateY.value = event.translationY
      dragY.set(event.translationY)
    })
    .onEnd(event => {
      if (savedScale.value > 1) {
        savedTranslateX.value = translateX.value
        savedTranslateY.value = translateY.value
        return
      }

      const shouldDismiss =
        Math.abs(event.translationY) > DISMISS_DISTANCE || Math.abs(event.velocityY) > DISMISS_VELOCITY

      if (!shouldDismiss) {
        translateY.value = withTiming(0)
        dragY.set(withTiming(0))
        return
      }

      // Фото улетает в ту сторону, куда его смахнули, и лайтбокс закрывается.
      const target = (event.translationY >= 0 ? 1 : -1) * height
      dragY.set(withTiming(target, { duration: 180 }))
      translateY.value = withTiming(target, { duration: 180 }, finished => {
        if (finished) scheduleOnRN(onDismiss)
      })
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
          // Пока грузится оригинал, видна копия из галереи — она уже в кэше.
          placeholder={{ uri: photoUrl(uri, 1280) }}
          placeholderContentFit='contain'
          style={{ width, height }}
          contentFit='contain'
          accessibilityLabel={accessibilityLabel}
        />
      </Animated.View>
    </GestureDetector>
  )
}
