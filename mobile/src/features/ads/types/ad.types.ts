// Типы ответа GET /ads (AdsService.findAll на сервере). Описаны только поля,
// которые реально использует приложение: сервер отдаёт больше, но тип,
// перечисляющий неиспользуемые поля, только создаёт иллюзию, что они
// где-то проверены и нужны. Смысл полей — как в client/src/components/
// features/ads/types/ad.types.ts (IAd); при изменении ответа сервера
// сверяйте оба места.

// Значения — строго как в enum AdBadge на сервере (prisma/schema.prisma).
export type AdBadge = 'URGENT' | 'NEGOTIABLE' | 'NEW'

export interface AdListItemUser {
  id: string
  // Для выделения цены у премиум-продавцов (см. isPriceHighlighted).
  premiumUntil?: string | null
}

export interface AdListItem {
  id: string
  title: string
  price: number | null
  // Ключ enum PriceUnit сервера ('TON', 'KG', ...), см. PRICE_UNITS_SHORT.
  unit?: string | null
  address: string
  locality?: string | null
  images: string[]
  user?: AdListItemUser
  priceHighlightUntil?: string | null
  badge?: AdBadge | null
  badgeUntil?: string | null
  // Есть только при поиске по радиусу (lat/lng в запросе), иначе null.
  distanceKm?: number | null
}

export interface AdsListResponse {
  items: AdListItem[]
  total: number
  page: number
  limit: number
}
