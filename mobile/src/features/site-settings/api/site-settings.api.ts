import { apiClient } from '@/lib/api/api-client'

import type { SiteFlags } from '../types/site-settings.types'

export const siteSettingsApi = {
  // Публичная ручка: работает и для гостя, ключ сессии не нужен.
  fetchPublicFlags: (signal?: AbortSignal) => apiClient.get<SiteFlags>('/site-settings/public', { signal })
}
