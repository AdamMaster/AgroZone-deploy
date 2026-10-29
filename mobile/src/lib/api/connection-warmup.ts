import { useEffect } from 'react'
import { AppState, Platform } from 'react-native'

import { apiClient } from './api-client'
import { ApiError } from './api-error'

// Пока телефон лежал с погашенным экраном, мобильная сеть или Wi-Fi забывают
// о соединении с сервером, а приложение этого не знает и первые запросы
// после возвращения отправляет в «мёртвое» соединение: они висят до таймаута.
// Поэтому при возврате в приложение после паузы сразу отправляем лёгкий
// запрос с коротким пределом: он «пробивает» соединение (или заставляет
// открыть новое), а к моменту, когда человек нажмёт «Опубликовать», связь уже
// живая. Результат не нужен — важен сам факт обмена.
const IDLE_MS = 20_000
const PROBE_TIMEOUT_MS = 4_000
const MAX_PROBES = 3

async function warmUpConnection(): Promise<void> {
  for (let attempt = 0; attempt < MAX_PROBES; attempt += 1) {
    try {
      await apiClient.get('/site-settings/public', { timeoutMs: PROBE_TIMEOUT_MS })
      return
    } catch (error) {
      // Любой ответ сервера (даже ошибка) значит, что связь есть.
      if (error instanceof ApiError && error.statusCode > 0) return
    }
  }
}

export function useConnectionWarmup() {
  useEffect(() => {
    if (Platform.OS === 'web') return

    let leftAt: number | null = null

    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        leftAt ??= Date.now()
        return
      }

      if (leftAt !== null && Date.now() - leftAt >= IDLE_MS) {
        void warmUpConnection()
      }

      leftAt = null
    })

    return () => subscription.remove()
  }, [])
}
