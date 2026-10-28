'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { sellerReviewsAdminService } from '../services/seller-reviews-admin.service'
import { SellerReviewModerationDecision } from '../types/admin.types'
import { ADMIN_SELLER_REVIEWS_QUERY_KEY } from './use-admin-seller-reviews'

export function useModerateSellerReview() {
  const queryClient = useQueryClient()

  const { mutate: moderateSellerReview, isPending: isModerating } = useMutation({
    mutationKey: ['moderate-seller-review'],
    mutationFn: ({ id, decision }: { id: string; decision: SellerReviewModerationDecision }) =>
      sellerReviewsAdminService.moderate(id, decision),

    onSuccess(_data, { decision }) {
      toast.success(decision === SellerReviewModerationDecision.Hide ? 'Отзыв скрыт' : 'Отзыв опубликован')
      queryClient.invalidateQueries({ queryKey: ADMIN_SELLER_REVIEWS_QUERY_KEY })
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { moderateSellerReview, isModerating }
}
