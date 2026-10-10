import type { AdStatus } from '@/features/my-ads/types/my-ad.types'

import type { SellerType } from '@/shared/constants/seller-types'

import type { AdBadge } from './ad.types'

// Продавец на странице объявления (buildSellerSelect на сервере).
export interface AdSeller {
  id: string
  displayName: string | null
  picture: string | null
  type: SellerType
  // Название ИП/компании из DaData — только у подтвердивших ИНН.
  businessName: string | null
  businessVerifiedAt: string | null
  premiumUntil: string | null
  // Сколько ещё опубликованных объявлений у продавца (без этого).
  adsCount: number
}

// Объявление целиком — GET /ads/:id (публичное) и GET /ads/my/:id
// (владельцу, в любом статусе). Описаны только поля, которые использует
// приложение.
export interface AdDetail {
  id: string
  title: string
  description: string
  price: number | null
  unit: string
  address: string
  images: string[]
  // Значения характеристик по имени (CategoryFeature.name) плюс служебные
  // поля «<name>__unit», «<name>__sellerValue», «<name>__sellerUnit».
  features: Record<string, unknown>
  categoryId: string
  userId: string
  status: AdStatus
  rejectionReason: string | null
  publishedAt: string | null
  bumpedAt: string | null
  badge: AdBadge | null
  badgeUntil: string | null
  priceHighlightUntil: string | null
  // Есть только в публичном ответе и только для вошедшего.
  isFavorite?: boolean
  user: AdSeller | null
}

export interface AdCounters {
  viewsTotal: number
  viewsToday: number
  favoritesCount: number
}

// Просмотры за неделю (понедельник — воскресенье), GET /ads/my/:id/views.
export interface AdViewStats {
  weekStart: string
  weekEnd: string
  weekOffset: number
  maxWeekOffset: number
  total: number
  days: { date: string; views: number }[]
}

// Значения — как enum AdReportReason сервера.
export type AdReportReason = 'SCAM' | 'WRONG_CATEGORY' | 'PROHIBITED_ITEM' | 'DUPLICATE' | 'SPAM' | 'OTHER'
