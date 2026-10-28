import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner-native'

import { showError } from '@/lib/ui/show-error'

import { sellerReviewsApi } from '../api/seller-reviews.api'
import type { SellerReportReason, SellerReviewInput, SellerReviewReportReason } from '../types/seller-review.types'
import { mySellerReviewQueryKey, sellerReviewsQueryKey } from './use-seller-reviews'

// Рейтинг продавца меняется от любой правки отзыва, поэтому после действий
// перезапрашиваем и список, и «мой отзыв». Страница продавца и объявление
// получат новое среднее при следующей загрузке.
function useInvalidateReviews(sellerId: string) {
  const queryClient = useQueryClient()

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: sellerReviewsQueryKey(sellerId) }),
      queryClient.invalidateQueries({ queryKey: mySellerReviewQueryKey(sellerId) }),
      queryClient.invalidateQueries({ queryKey: ['sellers', sellerId] })
    ])
}

export function useCreateSellerReview(sellerId: string) {
  const invalidate = useInvalidateReviews(sellerId)

  return useMutation({
    mutationFn: (dto: SellerReviewInput) => sellerReviewsApi.create(sellerId, dto),
    onSuccess: review => {
      toast.success(
        review.status === 'PENDING' ? 'Отзыв отправлен на проверку — он появится после неё' : 'Спасибо за отзыв!'
      )
      return invalidate()
    },
    onError: showError
  })
}

export function useUpdateSellerReview(sellerId: string) {
  const invalidate = useInvalidateReviews(sellerId)

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: SellerReviewInput }) => sellerReviewsApi.update(id, dto),
    onSuccess: () => {
      toast.success('Отзыв обновлён')
      return invalidate()
    },
    onError: showError
  })
}

export function useRemoveSellerReview(sellerId: string) {
  const invalidate = useInvalidateReviews(sellerId)

  return useMutation({
    mutationFn: (id: string) => sellerReviewsApi.remove(id),
    onSuccess: () => {
      toast.success('Отзыв удалён')
      return invalidate()
    },
    onError: showError
  })
}

export function useReplySellerReview(sellerId: string) {
  const invalidate = useInvalidateReviews(sellerId)

  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => sellerReviewsApi.reply(id, text),
    onSuccess: () => {
      toast.success('Ответ опубликован')
      return invalidate()
    },
    onError: showError
  })
}

export function useReportSellerReview() {
  return useMutation({
    mutationFn: ({ id, reason, comment }: { id: string; reason: SellerReviewReportReason; comment?: string }) =>
      sellerReviewsApi.reportReview(id, reason, comment),
    onSuccess: () => toast.success('Жалоба отправлена, спасибо — мы её рассмотрим'),
    onError: showError
  })
}

export function useReportSeller(sellerId: string) {
  return useMutation({
    mutationFn: ({ reason, comment }: { reason: SellerReportReason; comment?: string }) =>
      sellerReviewsApi.reportSeller(sellerId, reason, comment),
    onSuccess: () => toast.success('Жалоба отправлена, спасибо — мы её рассмотрим'),
    onError: showError
  })
}
