// Значения — строго как SiteFlagKey на бэкенде (server/src/site-settings/
// constants/site-flags.constants.ts). Новый флаг добавляется в оба места.
export enum SiteFlagKey {
  SellerRatings = 'sellerRatings'
}

export type SiteFlags = Record<SiteFlagKey, boolean>
