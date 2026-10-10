import type { AdBadge } from '@/features/ads/types/ad.types'

// Значения — как enum AdStatus сервера (prisma/schema.prisma).
export type AdStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED' | 'EXPIRED'

// Своё объявление в «Моих объявлениях» (GET /ads/my). Описаны только поля,
// которые использует приложение.
export interface MyAd {
  id: string
  title: string
  price: number | null
  unit?: string | null
  address: string
  images: string[]
  status: AdStatus
  // Причина отклонения модератором — только у REJECTED.
  rejectionReason?: string | null
  // Платные услуги и когда они заканчиваются.
  bumpServiceUntil?: string | null
  bumpedAt?: string | null
  priceHighlightUntil?: string | null
  badge?: AdBadge | null
  badgeUntil?: string | null
}

// Число своих объявлений в каждом статусе (GET /ads/my/status-counts).
export type MyAdsStatusCounts = Readonly<Record<AdStatus, number>>
