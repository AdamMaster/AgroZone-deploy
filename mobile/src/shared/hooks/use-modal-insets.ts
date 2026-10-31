import { type EdgeInsets, useSafeAreaInsets } from 'react-native-safe-area-context'

// Отступы от системных панелей для содержимого Modal. Окна Modal в приложении
// объявлены на весь экран (statusBarTranslucent + navigationBarTranslucent) —
// и на Android 15+, и на старых версиях, и на оболочках вроде MIUI/ColorOS.
// Раньше здесь предполагалось, что до Android 15 окно модального окна само
// отступает от панелей, и отступы не добавлялись: на телефонах с кнопками
// навигации (Xiaomi, Realme и др.) панель нижних кнопок ложилась поверх
// нижних пунктов шторки (например «Выйти» в меню профиля). На Pixel с
// жестовой навигацией этого не видно, поэтому там ошибка не проявлялась.
// Теперь окно везде одинаковое, а отступы везде берутся из системных.
export function useModalInsets(): EdgeInsets {
  return useSafeAreaInsets()
}
