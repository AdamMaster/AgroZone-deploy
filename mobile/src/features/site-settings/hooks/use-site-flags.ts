import { useQuery } from '@tanstack/react-query'

import { siteSettingsApi } from '../api/site-settings.api'
import { DEFAULT_SITE_FLAGS, SITE_FLAGS_QUERY_KEY, SITE_FLAGS_STALE_TIME_MS } from '../constants/site-flags.constants'
import type { SiteFlags } from '../types/site-settings.types'

// Флаги возможностей приложения: const { sellerRatings } = useSiteFlags().
// Пока ответа нет (и если его не будет) — значения по умолчанию, то есть
// «выключено»; состояния загрузки у вызывающего кода нет. Значения по
// умолчанию подмешиваются и к ответу: если сервер уже знает флаг, которого
// в этой сборке нет (или наоборот), ни один ключ не окажется undefined.
export function useSiteFlags(): SiteFlags {
  const { data } = useQuery({
    queryKey: SITE_FLAGS_QUERY_KEY,
    queryFn: ({ signal }) => siteSettingsApi.fetchPublicFlags(signal),
    staleTime: SITE_FLAGS_STALE_TIME_MS,
    select: flags => ({ ...DEFAULT_SITE_FLAGS, ...flags })
  })

  return data ?? DEFAULT_SITE_FLAGS
}
