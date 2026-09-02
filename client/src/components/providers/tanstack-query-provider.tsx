'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type PropsWithChildren, useState } from 'react'

export function TanstackQueryProvider({ children }: PropsWithChildren<unknown>) {
  const [client] = useState(
    new QueryClient({
      defaultOptions: {
        queries: {
          // 1. Убираем фокус (у тебя уже есть)
          refetchOnWindowFocus: false,

          // 2. Данные считаются свежими 60 секунд — раньше тут стоял 0
          // (оставлено "на время отладки"), из-за чего вообще ЛЮБОЙ
          // useQuery в приложении дублировал запрос сразу при
          // монтировании поверх уже полученных SSR/initialData данных.
          // Запросам, которым нужен принудительный рефетч на маунте
          // (например useAd — там на этом держится счётчик просмотров),
          // staleTime: 0 выставлен точечно в самом useQuery.
          staleTime: 60000,

          // 3. Выключаем ретраи (повторные попытки) на время отладки.
          // Если есть ошибка (401 или CORS), ты увидишь её МГНОВЕННО,
          // а не через 30 секунд ожидания.
          retry: false,

          // 4. Если интернет подтупливает в докере, это не даст запросу "зависнуть"
          networkMode: 'always'
        },
        mutations: {
          retry: false
        }
      }
    })
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
