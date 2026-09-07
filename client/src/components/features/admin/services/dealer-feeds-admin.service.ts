import { api } from '@/shared/api'

import { IDealerFeedListResponse, IDealerFeedPreview } from '@/components/features/dealer-feeds/types/dealer-feed.types'

class DealerFeedsAdminService {
  private URL = 'dealer-feeds/admin'

  async findPending(page = 1, limit = 20): Promise<IDealerFeedListResponse> {
    return api.get<IDealerFeedListResponse>(`${this.URL}/pending?page=${page}&limit=${limit}`)
  }

  async findAll(page = 1, limit = 20): Promise<IDealerFeedListResponse> {
    return api.get<IDealerFeedListResponse>(`${this.URL}?page=${page}&limit=${limit}`)
  }

  async preview(id: string): Promise<IDealerFeedPreview> {
    return api.get<IDealerFeedPreview>(`${this.URL}/${id}/preview`)
  }

  async approve(id: string) {
    return api.patch(`${this.URL}/${id}/approve`)
  }

  async reject(id: string, reason: string) {
    return api.patch(`${this.URL}/${id}/reject`, { reason })
  }
}

export const dealerFeedsAdminService = new DealerFeedsAdminService()
