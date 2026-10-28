import { apiClient } from '@/lib/api/api-client'

import type {
  MySellerReview,
  SellerReportReason,
  SellerReview,
  SellerReviewInput,
  SellerReviewReportReason,
  SellerReviewsPage
} from '../types/seller-review.types'

// Все ручки отвечают 404, пока рейтинги выключены в админке: приложение их в
// этом случае и не вызывает (см. useSiteFlags).
export const sellerReviewsApi = {
  fetchForSeller: (sellerId: string, cursor: string | undefined, signal?: AbortSignal) =>
    apiClient.get<SellerReviewsPage>(`/users/${sellerId}/reviews`, { params: { cursor }, signal }),

  fetchMine: (sellerId: string, signal?: AbortSignal) =>
    apiClient.get<MySellerReview>(`/users/${sellerId}/reviews/mine`, { signal }),

  create: (sellerId: string, dto: SellerReviewInput) => apiClient.post<SellerReview>(`/users/${sellerId}/reviews`, dto),

  update: (reviewId: string, dto: SellerReviewInput) =>
    apiClient.patch<SellerReview>(`/seller-reviews/${reviewId}`, dto),

  remove: (reviewId: string) => apiClient.delete<void>(`/seller-reviews/${reviewId}`, { expectBody: false }),

  reply: (reviewId: string, text: string) => apiClient.put<SellerReview>(`/seller-reviews/${reviewId}/reply`, { text }),

  reportReview: (reviewId: string, reason: SellerReviewReportReason, comment?: string) =>
    apiClient.post<void>(`/seller-reviews/${reviewId}/reports`, { reason, comment }, { expectBody: false }),

  reportSeller: (sellerId: string, reason: SellerReportReason, comment?: string) =>
    apiClient.post<void>(`/users/${sellerId}/reports`, { reason, comment }, { expectBody: false })
}
