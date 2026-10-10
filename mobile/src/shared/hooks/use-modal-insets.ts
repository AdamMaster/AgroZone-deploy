import { Platform } from 'react-native'
import { type EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

const NO_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 }

// Отступы от системных панелей для содержимого Modal (без
// statusBarTranslucent). На Android окно модального окна само отступает от
// строки состояния, панели навигации и клавиатуры — свои отступы дали бы
// двойную полосу. На iOS полноэкранное модальное окно занимает весь экран,
// и отступы нужны.
export function useModalInsets(): EdgeInsets {
  const insets = useSafeAreaInsets()

  return Platform.OS === 'ios' ? insets : NO_INSETS
}
