import { apiClient } from '@/lib/api/api-client'
import type { PaymentStatus } from '@/lib/payments/await-payment-result'

// Ответ на «оформить премиум» (POST /premium/checkout): куда отправить
// пользователя на оплату и номер платежа для последующей проверки.
export interface PremiumCheckout {
  confirmationUrl: string
  purchaseId: string
}

// Платёж за премиум (GET /premium/:purchaseId/status); описано только нужное
// приложению поле.
interface PremiumPurchase {
  status: PaymentStatus
}

export const premiumApi = {
  // Сумма и срок задаются сервером. returnUri — куда вернуть пользователя
  // после оплаты.
  createCheckout: (returnUri: string) => apiClient.post<PremiumCheckout>('/premium/checkout', { returnUri }),

  // Перепроверка платежа: сервер спрашивает ЮKassa напрямую и, если оплата
  // прошла, сразу включает премиум.
  fetchPurchase: (purchaseId: string) =>
    apiClient.get<PremiumPurchase>(`/premium/${encodeURIComponent(purchaseId)}/status`)
}
