import { api } from '@/shared/api'

import {
  DealerTier,
  ICreateDealerSubscriptionCheckoutResponse,
  IDealerFeed,
  IDealerFeedPreview,
  IDealerSubscription
} from '../types/dealer-feed.types'

class DealerFeedsService {
  private URL = 'dealer-feeds'

  async submit(url: string): Promise<IDealerFeed> {
    return api.post<IDealerFeed>(this.URL, { url })
  }

  async getMine(): Promise<IDealerFeed | null> {
    return api.get<IDealerFeed | null>(`${this.URL}/me`)
  }

  async previewMine(): Promise<IDealerFeedPreview> {
    return api.get<IDealerFeedPreview>(`${this.URL}/me/preview`)
  }

  async pause(): Promise<IDealerFeed> {
    return api.post<IDealerFeed>(`${this.URL}/me/pause`)
  }

  async resume(): Promise<IDealerFeed> {
    return api.post<IDealerFeed>(`${this.URL}/me/resume`)
  }

  async syncNow(): Promise<IDealerFeed> {
    return api.post<IDealerFeed>(`${this.URL}/me/sync`)
  }

  async createSubscriptionCheckout(tier: DealerTier): Promise<ICreateDealerSubscriptionCheckoutResponse> {
    return api.post<ICreateDealerSubscriptionCheckoutResponse>(`${this.URL}/me/subscription`, { tier })
  }

  async checkSubscriptionStatus(subscriptionId: string): Promise<IDealerSubscription> {
    return api.get<IDealerSubscription>(`${this.URL}/me/subscription/${subscriptionId}/status`)
  }
}

export const dealerFeedsService = new DealerFeedsService()
