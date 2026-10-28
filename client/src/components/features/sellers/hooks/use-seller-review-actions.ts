'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { sellerReviewsService } from '../services/seller-reviews.service'
import {
  ICreateSellerReportDto,
  ICreateSellerReviewDto,
  IReportSellerReviewDto,
  IUpdateSellerReviewDto
} from '../types'
import { MY_SELLER_REVIEW_KEY, SELLER_REVIEWS_KEY } from './use-seller-reviews'

// Рейтинг продавца меняется от любой правки отзыва, поэтому после действий
// перезапрашиваем и список, и «мой отзыв». Рейтинг в карточках списков и в
// объявлении обновится при следующей загрузке.
function useInvalidateReviews(sellerId: string) {
  const queryClient = useQueryClient()

  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: [SELLER_REVIEWS_KEY, sellerId] }),
      queryClient.invalidateQueries({ queryKey: [MY_SELLER_REVIEW_KEY, sellerId] })
    ])
}

export function useCreateSellerReview(sellerId: string) {
  const invalidate = useInvalidateReviews(sellerId)

  const { mutate: createReview, isPending: isCreating } = useMutation({
    mutationFn: (dto: ICreateSellerReviewDto) => sellerReviewsService.create(sellerId, dto),
    onSuccess: review => {
      toast.success(
        review.status === 'PENDING' ? 'Отзыв отправлен на проверку — он появится после неё' : 'Спасибо за отзыв!'
      )
      return invalidate()
    },
    onError: error => toastMessageHandler(error)
  })

  return { createReview, isCreating }
}

export function useUpdateSellerReview(sellerId: string) {
  const invalidate = useInvalidateReviews(sellerId)

  const { mutate: updateReview, isPending: isUpdating } = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IUpdateSellerReviewDto }) => sellerReviewsService.update(id, dto),
    onSuccess: () => {
      toast.success('Отзыв обновлён')
      return invalidate()
    },
    onError: error => toastMessageHandler(error)
  })

  return { updateReview, isUpdating }
}

export function useRemoveSellerReview(sellerId: string) {
  const invalidate = useInvalidateReviews(sellerId)

  const { mutate: removeReview, isPending: isRemoving } = useMutation({
    mutationFn: (id: string) => sellerReviewsService.remove(id),
    onSuccess: () => {
      toast.success('Отзыв удалён')
      return invalidate()
    },
    onError: error => toastMessageHandler(error)
  })

  return { removeReview, isRemoving }
}

export function useReplySellerReview(sellerId: string) {
  const invalidate = useInvalidateReviews(sellerId)

  const { mutate: replyReview, isPending: isReplying } = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => sellerReviewsService.reply(id, text),
    onSuccess: () => {
      toast.success('Ответ опубликован')
      return invalidate()
    },
    onError: error => toastMessageHandler(error)
  })

  return { replyReview, isReplying }
}

export function useReportSellerReview() {
  const { mutate: reportReview, isPending: isReporting } = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: IReportSellerReviewDto }) =>
      sellerReviewsService.reportReview(id, dto),
    onSuccess: () => toast.success('Жалоба отправлена, спасибо — мы её рассмотрим'),
    onError: error => toastMessageHandler(error)
  })

  return { reportReview, isReporting }
}

export function useReportSeller(sellerId: string) {
  const { mutate: reportSeller, isPending: isReporting } = useMutation({
    mutationFn: (dto: ICreateSellerReportDto) => sellerReviewsService.reportSeller(sellerId, dto),
    onSuccess: () => toast.success('Жалоба отправлена, спасибо — мы её рассмотрим'),
    onError: error => toastMessageHandler(error)
  })

  return { reportSeller, isReporting }
}
