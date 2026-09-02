import { api } from '@/shared/api'

import { AdBadge, AdServiceType, IAdServicePurchase, ICreateAdServiceCheckoutResponse } from '../types/ad.types'

class AdServicesService {
  private URL = 'ads'

  // Сумма всегда считается сервером из services — от клиента цена не
  // принимается (см. AdServicesController/AdServicesService на бэкенде).
  async createCheckout(
    adId: string,
    services: AdServiceType[],
    badge?: AdBadge
  ): Promise<ICreateAdServiceCheckoutResponse> {
    return api.post<ICreateAdServiceCheckoutResponse>(`${this.URL}/${adId}/services/checkout`, { services, badge })
  }

  // Ручная перепроверка статуса оплаты — без вебхука, тот же приём, что и
  // в ad-bumps.service.ts (см. комментарий там же).
  async checkStatus(adId: string, purchaseId: string): Promise<IAdServicePurchase> {
    return api.get<IAdServicePurchase>(`${this.URL}/${adId}/services/${purchaseId}/status`)
  }
}

export const adServicesService = new AdServicesService()
