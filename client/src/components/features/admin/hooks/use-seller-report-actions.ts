'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { sellerReportsAdminService } from '../services/seller-reports-admin.service'
import { SellerReportResolutionAction } from '../types/admin.types'
import { ADMIN_SELLER_REPORTS_QUERY_KEY, adminSellerReportCardQueryKey } from './use-admin-seller-reports'

const RESOLUTION_MESSAGES: Record<SellerReportResolutionAction, string> = {
  [SellerReportResolutionAction.Dismiss]: 'Жалобы отклонены',
  [SellerReportResolutionAction.Warn]: 'Продавцу вынесено предупреждение',
  [SellerReportResolutionAction.SuspendAds]: 'Объявления продавца приостановлены'
}

// Решение по жалобам и откат отзывов меняют и карточку продавца, и очередь.
function useRefreshSellerReports(sellerId: string) {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: adminSellerReportCardQueryKey(sellerId) })
    queryClient.invalidateQueries({ queryKey: ADMIN_SELLER_REPORTS_QUERY_KEY })
  }
}

export function useResolveSellerReports(sellerId: string) {
  const refresh = useRefreshSellerReports(sellerId)

  const { mutate: resolveSellerReports, isPending: isResolving } = useMutation({
    mutationKey: ['resolve-seller-reports', sellerId],
    mutationFn: ({ action, note }: { action: SellerReportResolutionAction; note?: string }) =>
      sellerReportsAdminService.resolve(sellerId, action, note),

    onSuccess(_data, { action }) {
      toast.success(RESOLUTION_MESSAGES[action])
      refresh()
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { resolveSellerReports, isResolving }
}

export function useRollbackSellerReviews(sellerId: string) {
  const refresh = useRefreshSellerReports(sellerId)

  const { mutate: rollbackSellerReviews, isPending: isRollingBack } = useMutation({
    mutationKey: ['rollback-seller-reviews', sellerId],
    mutationFn: ({ note }: { note?: string }) => sellerReportsAdminService.rollbackReviews(sellerId, note),

    onSuccess({ hidden }) {
      toast.success(hidden > 0 ? `Скрыто отзывов: ${hidden}` : 'У продавца нет отзывов для скрытия')
      refresh()
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { rollbackSellerReviews, isRollingBack }
}
