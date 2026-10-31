import { useEffect } from 'react'
import { AppState, Platform } from 'react-native'

import { resetConnections } from './connection-reset'

// Пока телефон лежал, сеть могла оборвать соединение с сервером. Если человек
// вернулся в приложение после заметной паузы, соединения из пула считаем
// недоверенными и закрываем: первый же запрос откроет новое и пройдёт сразу,
// а не будет висеть в «мёртвом».
const BACKGROUND_THRESHOLD_MS = 5_000

export function useConnectionRecovery() {
  useEffect(() => {
    if (Platform.OS === 'web') return

    let leftAt: number | null = null

    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        leftAt ??= Date.now()
        return
      }

      if (leftAt !== null && Date.now() - leftAt >= BACKGROUND_THRESHOLD_MS) {
        resetConnections()
      }

      leftAt = null
    })

    return () => subscription.remove()
  }, [])
}
