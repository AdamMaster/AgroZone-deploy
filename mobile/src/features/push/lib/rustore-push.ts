import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

interface RuStorePushNativeModule {
  getToken(): Promise<string>
}

// Нативный модуль modules/rustore-push (только Android). В вебе и на iOS его
// нет — push там не поддерживаются, и всё ниже тихо ничего не делает.
const nativeModule =
  Platform.OS === 'android' ? requireOptionalNativeModule<RuStorePushNativeModule>('RuStorePush') : null

// Токен устройства в RuStore Push или null, если получить его нельзя: на
// телефоне нет RuStore или в нём не выполнен вход, нет сети, в приложении не
// задан id проекта push. Это не ошибка приложения — просто без push.
export async function getRuStorePushToken(): Promise<string | null> {
  if (!nativeModule) return null

  try {
    return await nativeModule.getToken()
  } catch {
    return null
  }
}
