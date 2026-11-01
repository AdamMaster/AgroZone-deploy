import { apiClient } from '@/lib/api/api-client'

import type { AdServiceCheckout, AdServiceCheckoutParams, AdServicePurchase } from '../types/promote-ad.types'

const servicesPath = (adId: string) => `/ads/${encodeURIComponent(adId)}/services`

export const adServicesApi = {
  // Сервер сам считает сумму по списку услуг, из приложения она не
  // отправляется. returnUri — куда вернуть пользователя после оплаты.
  createCheckout: (adId: string, { services, badge }: AdServiceCheckoutParams, returnUri: string) =>
    apiClient.post<AdServiceCheckout>(`${servicesPath(adId)}/checkout`, { services, badge, returnUri }),

  // Перепроверка платежа: сервер спрашивает ЮKassa напрямую и, если оплата
  // прошла, сразу подключает услуги.
  fetchPurchase: (adId: string, purchaseId: string) =>
    apiClient.get<AdServicePurchase>(`${servicesPath(adId)}/${encodeURIComponent(purchaseId)}/status`)
}
