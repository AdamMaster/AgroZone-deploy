'use client'

import { useQuery } from '@tanstack/react-query'

import { siteSettingsAdminService } from '../services/site-settings-admin.service'

export const ADMIN_SITE_SETTINGS_QUERY_KEY = ['admin-site-settings']

export function useAdminSiteSettings() {
  const query = useQuery({
    queryKey: ADMIN_SITE_SETTINGS_QUERY_KEY,
    queryFn: () => siteSettingsAdminService.get()
  })

  return {
    settings: query.data,
    isLoading: query.isLoading,
    isError: query.isError
  }
}
