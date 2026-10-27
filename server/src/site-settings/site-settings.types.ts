import { SiteFlagKey } from './constants/site-flags.constants'

export type SiteFlags = Record<SiteFlagKey, boolean>

export interface SiteSettingActor {
  id: string
  displayName: string | null
}

export interface AdminSiteFlag {
  key: SiteFlagKey
  value: boolean
  // null — администратор флаг ещё не менял, действует значение по умолчанию.
  updatedAt: Date | null
  updatedBy: SiteSettingActor | null
}

export interface AdminSiteFlagChange {
  id: string
  key: SiteFlagKey
  value: boolean
  createdAt: Date
  // null — аккаунт администратора с тех пор удалён.
  changedBy: SiteSettingActor | null
}

export interface AdminSiteSettings {
  flags: AdminSiteFlag[]
  changes: AdminSiteFlagChange[]
}
