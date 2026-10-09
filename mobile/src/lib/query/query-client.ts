import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/lib/api/api-error'

const MAX_RETRIES = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Тот же минутный staleTime, что и на сайте (TanstackQueryProvider):
      // при возврате на уже открытый экран данные показываются мгновенно из
      // кэша и не перезапрашиваются, если им меньше минуты.
      staleTime: 60_000,
      // Повторяем только то, что может пройти со второй попытки (сеть,
      // таймаут, 5xx). 404/400 повторять бессмысленно — пользователь просто
      // дольше ждёт ту же ошибку.
      retry: (failureCount, error) => failureCount < MAX_RETRIES && (!(error instanceof ApiError) || error.isRetryable)
    }
  }
})
