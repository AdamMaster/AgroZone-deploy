import type { SellerType } from '@/shared/constants/seller-types'

import type { SellerRating } from './seller-review.types'

// Публичная карточка продавца — ответ GET /users/:id/public (UserService.
// getPublicProfile): только то, что безопасно показывать кому угодно.
export interface PublicSeller {
  id: string
  displayName: string | null
  picture: string | null
  type: SellerType
  businessName: string | null
  businessVerifiedAt: string | null
  premiumUntil: string | null
  createdAt: string
  // Опубликованные объявления, срок размещения которых не истёк.
  adsCount: number
  presentationUrl: string | null
  presentationFileName: string | null
  // Рейтинг по отзывам. Приходит только при включённых рейтингах.
  rating?: SellerRating
}
