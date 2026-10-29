import { useEffect } from 'react'
import { AppState } from 'react-native'

import { registerPushDevice } from '../lib/push-registration'

// Не чаще раза в несколько часов при возвращении в приложение: токен меняется
// редко, а запрос на каждое разворачивание лишний.
const REREGISTER_INTERVAL_MS = 6 * 60 * 60 * 1000

// Регистрирует устройство для push, пока пользователь вошёл (монтируется только
// для вошедшего, см. PushRegistration).
export function usePushRegistration(): void {
  useEffect(() => {
    let lastRegisteredAt = 0

    const register = () => {
      lastRegisteredAt = Date.now()
      void registerPushDevice()
    }

    register()

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && Date.now() - lastRegisteredAt > REREGISTER_INTERVAL_MS) register()
    })

    return () => subscription.remove()
  }, [])
}
