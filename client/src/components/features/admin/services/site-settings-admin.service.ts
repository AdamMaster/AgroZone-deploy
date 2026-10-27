import { api } from '@/shared/api'

import { SiteFlagKey } from '../../site-settings/types/site-settings.types'
import { IAdminSiteFlag, IAdminSiteSettings } from '../types/admin.types'

class SiteSettingsAdminService {
  private URL = 'admin/site-settings'

  async get(): Promise<IAdminSiteSettings> {
    return api.get<IAdminSiteSettings>(this.URL)
  }

  async update(key: SiteFlagKey, value: boolean): Promise<IAdminSiteFlag> {
    return api.patch<IAdminSiteFlag>(`${this.URL}/${key}`, { value })
  }
}

export const siteSettingsAdminService = new SiteSettingsAdminService()
