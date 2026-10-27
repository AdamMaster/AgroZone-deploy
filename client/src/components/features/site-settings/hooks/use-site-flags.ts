'use client'

import { useContext } from 'react'

import { SiteFlagsContext } from '../context/site-flags-context'
import { SiteFlags } from '../types/site-settings.types'

// Флаги сайта для клиентских компонентов: const { sellerRatings } =
// useSiteFlags(). Серверным компонентам провайдер не доступен — они
// читают флаги напрямую через siteSettingsService.getPublicFlags().
export function useSiteFlags(): SiteFlags {
  return useContext(SiteFlagsContext)
}
