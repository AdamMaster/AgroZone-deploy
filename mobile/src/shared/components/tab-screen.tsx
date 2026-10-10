import type { PropsWithChildren } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Экран вкладки без системной шапки (как страницы сайта на телефоне):
// содержимое начинается сразу под строкой состояния.
export function TabScreen({ children }: PropsWithChildren) {
  const { top } = useSafeAreaInsets()

  return (
    <View className='flex-1 bg-background' style={{ paddingTop: top }}>
      {children}
    </View>
  )
}
