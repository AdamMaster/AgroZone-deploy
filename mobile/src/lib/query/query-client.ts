import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/lib/api/api-error'

const MAX_RETRIES = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // По умолчанию react-query ставит запросы на паузу, пока считает, что
      // сети нет, и ждёт сигнала «сеть появилась». Если сигнал не пришёл (ложное
      // «нет сети» после сна телефона), экран вечно крутит загрузку. Запрос
      // отправляем всегда: нет связи — он быстро упадёт с понятной ошибкой.
      networkMode: 'always',
      // Тот же минутный staleTime, что и на сайте (TanstackQueryProvider):
      // при возврате на уже открытый экран данные показываются мгновенно из
      // кэша и не перезапрашиваются, если им меньше минуты.
      staleTime: 60_000,
      // Повторяем только то, что может пройти со второй попытки (сеть,
      // таймаут, 5xx). 404/400 повторять бессмысленно — пользователь просто
      // дольше ждёт ту же ошибку.
      retry: (failureCount, error) => failureCount < MAX_RETRIES && (!(error instanceof ApiError) || error.isRetryable)
    },
    mutations: {
      networkMode: 'always'
    }
  }
})
