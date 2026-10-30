import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

interface FirebasePushNativeModule {
  getToken(): Promise<string>
  clearNotifications(): void
}

// Сколько ждём токен FCM: на телефонах без сервисов Google или при недоступном
// Google запрос может повиснуть, а приложению тогда надо переходить на RuStore.
const FCM_TOKEN_TIMEOUT_MS = 8000

// Нативный модуль modules/firebase-push (только Android). В вебе и на iOS его
// нет — тогда всё ниже тихо ничего не делает.
const nativeModule =
  Platform.OS === 'android' ? requireOptionalNativeModule<FirebasePushNativeModule>('FirebasePush') : null

// Токен устройства в Firebase Cloud Messaging или null, если получить его
// нельзя: нет сервисов Google, нет сети, в сборке нет google-services.json.
// Это не ошибка приложения — тогда работает RuStore.
export async function getFcmToken(): Promise<string | null> {
  if (!nativeModule) return null

  try {
    return await Promise.race([
      nativeModule.getToken(),
      new Promise<null>(resolve => setTimeout(() => resolve(null), FCM_TOKEN_TIMEOUT_MS))
    ])
  } catch {
    return null
  }
}

// Убирает уведомления приложения из шторки (человек открыл приложение и видит
// новые сообщения в нём). Старые сборки без этой функции просто пропускаем.
export function clearPushNotifications(): void {
  try {
    nativeModule?.clearNotifications?.()
  } catch {
    // Уведомления в шторке — не повод для ошибки.
  }
}
