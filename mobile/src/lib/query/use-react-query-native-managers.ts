import { focusManager, onlineManager } from '@tanstack/react-query'
import * as Network from 'expo-network'
import { useEffect } from 'react'
import { AppState, Platform } from 'react-native'

// react-query из коробки знает про фокус и сеть только в браузере (события
// window). В нативном приложении их нужно подключить вручную:
//  - фокус = приложение на переднем плане. Вернулись в приложение —
//    устаревшие данные на открытом экране обновляются сами;
//  - сеть = есть подключение. Пропал интернет — запросы ставятся на паузу,
//    а не сыплют ошибками, появился — продолжаются автоматически.
// На вебе (используется только для проверки вёрстки) react-query справляется
// сам, поэтому там ничего не подключаем.
export function useReactQueryNativeManagers() {
  useEffect(() => {
    if (Platform.OS === 'web') return

    const appStateSubscription = AppState.addEventListener('change', status => {
      focusManager.setFocused(status === 'active')
    })

    onlineManager.setEventListener(setOnline => {
      const networkSubscription = Network.addNetworkStateListener(state => {
        setOnline(state.isConnected !== false)
      })

      return () => networkSubscription.remove()
    })

    return () => appStateSubscription.remove()
  }, [])
}
