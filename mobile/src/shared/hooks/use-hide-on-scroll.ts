import { useCallback, useRef, useState } from 'react'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'

// У самого верха элемент виден всегда: на первых пикселях прокрутки
// (особенно при «резиновом» оттягивании на iOS) он бы дёргался.
const ALWAYS_VISIBLE_TOP = 8
// Меньшие сдвиги — дрожание пальца, а не смена направления.
const DIRECTION_THRESHOLD = 4

// Видимость элемента, который прячется при прокрутке вниз и возвращается
// при прокрутке вверх (плавающая кнопка) — как useFabVisibleOnScroll сайта.
export function useHideOnScroll() {
  const [isVisible, setIsVisible] = useState(true)
  const lastOffsetRef = useRef(0)

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = event.nativeEvent.contentOffset.y
    const delta = offset - lastOffsetRef.current

    if (offset <= ALWAYS_VISIBLE_TOP) {
      setIsVisible(true)
    } else if (Math.abs(delta) > DIRECTION_THRESHOLD) {
      setIsVisible(delta < 0)
    }

    lastOffsetRef.current = offset
  }, [])

  return { isVisible, onScroll }
}
