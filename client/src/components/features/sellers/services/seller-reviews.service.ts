import { api } from '@/shared/api'

import {
  ICreateSellerReportDto,
  ICreateSellerReviewDto,
  IMySellerReview,
  IReportSellerReviewDto,
  ISellerReview,
  ISellerReviewsResponse,
  IUpdateSellerReviewDto
} from '../types'

class SellerReviewsService {
  // Все ручки отвечают 404, пока рейтинги выключены в админке: клиент в этом
  // случае их и не вызывает (см. useSiteFlags).
  async findForSeller(sellerId: string, params?: { cursor?: string; limit?: number }) {
    return api.get<ISellerReviewsResponse>(`users/${sellerId}/reviews`, { params })
  }

  async findMine(sellerId: string) {
    return api.get<IMySellerReview>(`users/${sellerId}/reviews/mine`)
  }

  async create(sellerId: string, dto: ICreateSellerReviewDto) {
    return api.post<ISellerReview>(`users/${sellerId}/reviews`, { ...dto })
  }

  async update(reviewId: string, dto: IUpdateSellerReviewDto) {
    return api.patch<ISellerReview>(`seller-reviews/${reviewId}`, { ...dto })
  }

  async remove(reviewId: string): Promise<void> {
    await api.delete(`seller-reviews/${reviewId}`)
  }

  async reply(reviewId: string, text: string) {
    return api.put<ISellerReview>(`seller-reviews/${reviewId}/reply`, { text })
  }

  async reportReview(reviewId: string, dto: IReportSellerReviewDto): Promise<void> {
    await api.post(`seller-reviews/${reviewId}/reports`, { ...dto })
  }

  async reportSeller(sellerId: string, dto: ICreateSellerReportDto): Promise<void> {
    await api.post(`users/${sellerId}/reports`, { ...dto })
  }
}

export const sellerReviewsService = new SellerReviewsService()
