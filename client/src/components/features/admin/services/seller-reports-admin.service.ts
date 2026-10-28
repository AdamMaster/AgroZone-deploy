import { api } from '@/shared/api'

import { ISellerReportCard, ISellerReportQueue, SellerReportResolutionAction } from '../types/admin.types'

export interface FindSellerReportsQueueParams {
  page?: number
  limit?: number
  [key: string]: string | number | undefined
}

class SellerReportsAdminService {
  private URL = 'admin/seller-reports'

  async findQueue(params: FindSellerReportsQueueParams): Promise<ISellerReportQueue> {
    return api.get<ISellerReportQueue>(this.URL, { params })
  }

  async getCard(sellerId: string): Promise<ISellerReportCard> {
    return api.get<ISellerReportCard>(`${this.URL}/sellers/${sellerId}`)
  }

  async resolve(sellerId: string, action: SellerReportResolutionAction, note?: string): Promise<void> {
    await api.post(`${this.URL}/sellers/${sellerId}/resolution`, { action, note })
  }

  async rollbackReviews(sellerId: string, note?: string): Promise<{ sellerId: string; hidden: number }> {
    return api.post<{ sellerId: string; hidden: number }>(`${this.URL}/sellers/${sellerId}/reviews-rollback`, { note })
  }
}

export const sellerReportsAdminService = new SellerReportsAdminService()
