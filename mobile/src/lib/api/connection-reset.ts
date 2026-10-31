import { requireOptionalNativeModule } from 'expo'
import { Platform } from 'react-native'

interface NetworkResilienceNativeModule {
  resetConnections(): void
}

// Нативный модуль modules/network-resilience (только Android). Без него (веб,
// iOS, старая сборка) сброс просто ничего не делает.
const nativeModule =
  Platform.OS === 'android' ? requireOptionalNativeModule<NetworkResilienceNativeModule>('NetworkResilience') : null

// Запрос, который только что отменили, освобождает соединение не мгновенно,
// а ещё не освобождённое соединение сброс пропустит. Небольшая задержка и
// склейка подряд идущих вызовов решают обе проблемы.
const RESET_DELAY_MS = 150

let pendingReset: ReturnType<typeof setTimeout> | null = null

// Закрывает простаивающие соединения с сервером, чтобы следующий запрос открыл
// новое. «Мёртвое» после сна телефона или смены сети соединение иначе
// остаётся в пуле, и все запросы уходят в него и висят до перезапуска
// приложения.
export function resetConnections() {
  if (!nativeModule || pendingReset) return

  pendingReset = setTimeout(() => {
    pendingReset = null
    nativeModule.resetConnections()
  }, RESET_DELAY_MS)
}
