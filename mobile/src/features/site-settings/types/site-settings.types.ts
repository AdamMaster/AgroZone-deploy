// Значения — строго как SiteFlagKey на бэкенде (server/src/site-settings/
// constants/site-flags.constants.ts). Новый флаг добавляется в оба места.
export const SITE_FLAG_KEYS = {
  SELLER_RATINGS: 'sellerRatings'
} as const

export type SiteFlagKey = (typeof SITE_FLAG_KEYS)[keyof typeof SITE_FLAG_KEYS]

export type SiteFlags = Record<SiteFlagKey, boolean>
