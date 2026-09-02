import { api } from '@/shared/api'

import { ICreatePremiumCheckoutResponse, IPremiumPurchase } from '../types/premium.types'

class PremiumService {
  private URL = 'premium'

  async createCheckout(): Promise<ICreatePremiumCheckoutResponse> {
    return api.post<ICreatePremiumCheckoutResponse>(`${this.URL}/checkout`)
  }

  // Ручная перепроверка статуса оплаты — без вебхука (см. premium.service.ts
  // на бэкенде, там же объяснение почему: ngrok заблокирован в РФ).
  async checkStatus(purchaseId: string): Promise<IPremiumPurchase> {
    return api.get<IPremiumPurchase>(`${this.URL}/${purchaseId}/status`)
  }
}

export const premiumService = new PremiumService()
