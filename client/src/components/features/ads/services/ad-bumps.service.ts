import { api } from '@/shared/api'

import { IAdBump, ICreateBumpCheckoutResponse } from '../types/ad.types'

class AdBumpsService {
  private URL = 'ads'

  async createCheckout(adId: string): Promise<ICreateBumpCheckoutResponse> {
    return api.post<ICreateBumpCheckoutResponse>(`${this.URL}/${adId}/bump/checkout`)
  }

  // Ручная перепроверка статуса оплаты — без вебхука (см. ad-bumps.service.ts
  // на бэкенде, там же объяснение почему: ngrok заблокирован в РФ). Дёргается
  // со страницы объявления при возврате с оплаты, см. use-bump-status.ts.
  async checkStatus(adId: string, bumpId: string): Promise<IAdBump> {
    return api.get<IAdBump>(`${this.URL}/${adId}/bump/${bumpId}/status`)
  }
}

export const adBumpsService = new AdBumpsService()
