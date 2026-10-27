import { api } from '@/shared/api'

import { DEFAULT_SITE_FLAGS, SITE_FLAGS_REVALIDATE_SECONDS } from '../constants/site-flags.constants'
import { SiteFlags } from '../types/site-settings.types'

class SiteSettingsService {
  private URL = 'site-settings'

  // Вызывается на сервере в (main)/layout.tsx. Флаги — дополнительные
  // возможности, поэтому недоступность этой ручки не должна ронять весь
  // сайт: при любой ошибке отдаём «всё выключено» (см. DEFAULT_SITE_FLAGS).
  // Значения по умолчанию подмешиваются и к удачному ответу — если бэкенд
  // уже знает флаг, о котором этот билд сайта ещё не слышал (или наоборот),
  // ни один ключ не окажется undefined.
  async getPublicFlags(): Promise<SiteFlags> {
    try {
      const flags = await api.get<SiteFlags>(`${this.URL}/public`, {
        next: { revalidate: SITE_FLAGS_REVALIDATE_SECONDS }
      })

      return { ...DEFAULT_SITE_FLAGS, ...flags }
    } catch {
      return DEFAULT_SITE_FLAGS
    }
  }
}

export const siteSettingsService = new SiteSettingsService()
