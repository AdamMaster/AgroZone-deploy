import type { SellerType } from '@/shared/constants/seller-types'

// Типы ответов API объявлений. Описаны только поля, которые реально
// использует приложение: сервер отдаёт больше, но тип, перечисляющий
// неиспользуемые поля, только создаёт иллюзию, что они где-то проверены и
// нужны. Смысл полей — как в client/src/components/features/ads/types/
// ad.types.ts (IAd); при изменении ответа сервера сверяйте оба места.

// Значения — строго как в enum AdBadge на сервере (prisma/schema.prisma).
export type AdBadge = 'URGENT' | 'NEGOTIABLE' | 'NEW'

// Значения — как AdsSortBy на сервере (FindAdsQueryDto). distance_asc —
// только вместе с точкой поиска (lat/lng), иначе сервер ответит 400.
export type AdsSortBy = 'date_desc' | 'date_asc' | 'price_asc' | 'price_desc' | 'distance_asc'

export interface AdListItemUser {
  id: string
  // Для выделения цены у премиум-продавцов (см. AdCard).
  premiumUntil?: string | null
}

// Объявление в выдаче (GET /ads).
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
  // Только для вошедшего пользователя (сервер смотрит на его сессию).
  isFavorite?: boolean
}

export interface AdsListResponse {
  items: AdListItem[]
  total: number
  page: number
  limit: number
}

// Условия выдачи — параметры GET /ads (FindAdsQueryDto сервера). Пустой
// объект — лента главной без фильтров (все объявления, новые сверху, с
// учётом поднятий). Собирается из фильтров экрана функцией toAdsFilters.
export interface AdsFilters {
  categoryId?: string
  search?: string
  sortBy?: AdsSortBy
  unit?: string
  minPrice?: string
  maxPrice?: string
  regionIsoCode?: string
  localityFiasId?: string
  sellerType?: SellerType
  lat?: string
  lng?: string
  radiusKm?: string
  // JSON фильтров по характеристикам категории.
  features?: string
}

// Объявление в избранном (GET /ads/me/favorites, AdsService.getFavorites):
// сервер отдаёт урезанный набор полей.
export interface FavoriteAd {
  id: string
  title: string
  price: number | null
  unit?: string | null
  address: string
  images: string[]
}
