import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { withUniwind } from 'uniwind'

// Сторонние компоненты, которым нужен className. Обёртки создаются один раз
// на уровне модуля (требование Uniwind): создание внутри компонента
// пересоздавало бы обёртку на каждом рендере.
export const StyledImage = withUniwind(Image)

// SafeAreaView из react-native-safe-area-context сам по себе className не
// понимает: без обёртки flex-1 молча терялся, и окно сжималось до высоты
// содержимого.
export const StyledSafeAreaView = withUniwind(SafeAreaView)
