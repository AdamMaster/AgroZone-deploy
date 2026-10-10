import { useCallback, useRef } from 'react'
import { Platform } from 'react-native'

// Пункт меню-шторки часто открывает своё окно (жалоба, «Поделиться»,
// страница сайта), а iOS не покажет новое окно, пока шторка ещё
// закрывается, — там действие выполняется после полного закрытия
// (onDismiss шторки). На Android окна открываются друг за другом без
// ожидания.
export function useSheetAction(onClose: () => void) {
  const pendingActionRef = useRef<(() => void) | null>(null)

  const runAction = useCallback(
    (action: () => void) => {
      onClose()

      if (Platform.OS === 'ios') {
        pendingActionRef.current = action
      } else {
        action()
      }
    },
    [onClose]
  )

  const onDismiss = useCallback(() => {
    const action = pendingActionRef.current
    pendingActionRef.current = null
    action?.()
  }, [])

  return { runAction, onDismiss }
}
