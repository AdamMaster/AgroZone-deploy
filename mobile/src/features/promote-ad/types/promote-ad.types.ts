import type { AdBadge } from '@/features/ads/types/ad.types'

import type { PaymentStatus } from '@/lib/payments/await-payment-result'

// Значения — строго как в enum AdServiceType на сервере (prisma/schema.prisma).
export type AdServiceType = 'BUMP' | 'PRICE_HIGHLIGHT' | 'BADGE'

// Ответ на «оплатить»: куда отправить пользователя и номер платежа для
// последующей проверки (POST /ads/:id/services/checkout).
export interface AdServiceCheckout {
  confirmationUrl: string
  purchaseId: string
}

// Платёж за услуги (GET /ads/:id/services/:purchaseId/status). Описано
// только нужное приложению поле.
export interface AdServicePurchase {
  status: PaymentStatus
}

export interface AdServiceCheckoutParams {
  services: readonly AdServiceType[]
  // Обязателен, только если среди услуг есть BADGE.
  badge?: AdBadge
}
