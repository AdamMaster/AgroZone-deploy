import { Platform } from 'react-native'
import { type EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

const NO_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 }

// С Android 15 (API 35) приложение всегда рисуется под системными панелями
// (edge-to-edge), в том числе окно Modal без statusBarTranslucent.
const EDGE_TO_EDGE_API_LEVEL = 35

// Отступы от системных панелей для содержимого Modal (без
// statusBarTranslucent). На Android до 15 окно модального окна само
// отступает от строки состояния, панели навигации и клавиатуры — свои
// отступы дали бы двойную полосу. На Android 15+ и на iOS окно занимает весь
// экран, и содержимое без отступов уезжает под строку состояния.
export function useModalInsets(): EdgeInsets {
  const insets = useSafeAreaInsets()

  const windowInsetsItself = Platform.OS === 'android' && Number(Platform.Version) < EDGE_TO_EDGE_API_LEVEL

  return windowInsetsItself ? NO_INSETS : insets
}
