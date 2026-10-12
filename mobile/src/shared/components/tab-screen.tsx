import type { PropsWithChildren } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { PortalHost } from './portal'

// Экран вкладки без системной шапки (как страницы сайта на телефоне):
// содержимое начинается сразу под строкой состояния. Слой Portal — для
// того, что рисуется поверх всего экрана (подсказки поиска).
export function TabScreen({ children }: PropsWithChildren) {
  const { top } = useSafeAreaInsets()

  return (
    <View className='flex-1 bg-background' style={{ paddingTop: top }}>
      <PortalHost>{children}</PortalHost>
    </View>
  )
}
