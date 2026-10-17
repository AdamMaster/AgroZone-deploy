import { isFutureDate } from '@/shared/utils/date'

import type { AdBadge } from '../types/ad.types'

// Поля платных услуг у объявления из выдачи и из карточки объявления —
// у обоих они одни и те же.
interface PromotedAd {
  priceHighlightUntil?: string | null
  badge?: AdBadge | null
  badgeUntil?: string | null
  user?: { premiumUntil?: string | null } | null
}

// Цена выделяется, пока активна платная услуга или премиум у продавца —
// то же правило, что на сайте.
export const isPriceHighlighted = (ad: PromotedAd): boolean =>
  isFutureDate(ad.priceHighlightUntil) || isFutureDate(ad.user?.premiumUntil)

// Значок на фото: только пока услуга не истекла.
export const getActiveBadge = (ad: PromotedAd): AdBadge | null =>
  ad.badge && isFutureDate(ad.badgeUntil) ? ad.badge : null
