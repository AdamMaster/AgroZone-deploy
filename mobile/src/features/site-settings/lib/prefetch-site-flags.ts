import { queryClient } from '@/lib/query/query-client'

import { siteSettingsApi } from '../api/site-settings.api'
import {
  SITE_FLAGS_QUERY_KEY,
  SITE_FLAGS_SPLASH_TIMEOUT_MS,
  SITE_FLAGS_STALE_TIME_MS
} from '../constants/site-flags.constants'

// Загружает флаги, пока показан сплэш, — чтобы функция, включённая в
// админке, была на экране с первого кадра, а не «выскакивала» через
// мгновение после запуска. Никогда не отклоняется и ждёт не дольше
// SITE_FLAGS_SPLASH_TIMEOUT_MS: нет сети или сервер медленный — приложение
// всё равно откроется (флаги тогда подтянет useSiteFlags).
export async function prefetchSiteFlags(): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined

  const timeout = new Promise<void>(resolve => {
    timer = setTimeout(resolve, SITE_FLAGS_SPLASH_TIMEOUT_MS)
  })

  // retry: false — на запуске повторные попытки только затянули бы сплэш.
  // prefetchQuery сам глотает ошибки запроса.
  const prefetch = queryClient.prefetchQuery({
    queryKey: SITE_FLAGS_QUERY_KEY,
    queryFn: ({ signal }) => siteSettingsApi.fetchPublicFlags(signal),
    staleTime: SITE_FLAGS_STALE_TIME_MS,
    retry: false
  })

  await Promise.race([prefetch, timeout])

  clearTimeout(timer)
}
