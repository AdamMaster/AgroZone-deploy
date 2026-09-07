// Значения — строго как в enum'ах на бэкенде (prisma/schema.prisma).
export type DealerFeedStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'
export type DealerTier = 'UP_TO_20' | 'UP_TO_100' | 'UNLIMITED'
export type DealerSubscriptionStatus = 'PENDING' | 'SUCCEEDED' | 'CANCELED'

export interface IDealerFeed {
  id: string
  userId: string
  url: string
  status: DealerFeedStatus
  rejectionReason?: string | null
  reviewedAt?: string | null
  isPaused: boolean
  subscriptionTier?: DealerTier | null
  subscriptionUntil?: string | null
  lastSyncAt?: string | null
  lastSyncError?: string | null
  lastSyncItemsTotal?: number | null
  lastSyncItemsCreated?: number | null
  lastSyncItemsUpdated?: number | null
  lastSyncItemsRemoved?: number | null
  lastSyncItemsFailed?: number | null
  lastSyncItemErrors?: IDealerFeedOfferError[] | null
  createdAt: string
  updatedAt: string
}

export interface IDealerFeedOfferError {
  offerId: string | null
  offerIndex: number
  offerTitle: string | null
  reason: string
}

export interface IDealerFeedPreview {
  globalError: string | null
  totalValid: number
  totalErrors: number
  sampleTitles: string[]
  errors: IDealerFeedOfferError[]
}

export interface IDealerSubscription {
  id: string
  dealerFeedId: string
  userId: string
  tier: DealerTier
  amount: number
  status: DealerSubscriptionStatus
  createdAt: string
  paidAt?: string | null
}

export interface ICreateDealerSubscriptionCheckoutResponse {
  confirmationUrl: string
  subscriptionId: string
}

// Для админ-очереди — GET /dealer-feeds/admin(/pending) отдаёт фид вместе
// с коротким срезом данных владельца.
export interface IDealerFeedWithOwner extends IDealerFeed {
  user: {
    id: string
    displayName: string | null
    email: string | null
    businessName: string | null
  }
}

export interface IDealerFeedListResponse {
  items: IDealerFeedWithOwner[]
  total: number
  page: number
  limit: number
}
