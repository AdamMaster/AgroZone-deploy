import { api } from '@/shared/api'

import { ISellerReviewModerationQueue, SellerReviewModerationDecision } from '../types/admin.types'

export interface FindReviewModerationQueueParams {
  page?: number
  limit?: number
  [key: string]: string | number | undefined
}

class SellerReviewsAdminService {
  private URL = 'admin/seller-reviews'

  async findQueue(params: FindReviewModerationQueueParams): Promise<ISellerReviewModerationQueue> {
    return api.get<ISellerReviewModerationQueue>(this.URL, { params })
  }

  async moderate(id: string, decision: SellerReviewModerationDecision): Promise<void> {
    await api.patch(`${this.URL}/${id}/moderation`, { decision })
  }
}

export const sellerReviewsAdminService = new SellerReviewsAdminService()
