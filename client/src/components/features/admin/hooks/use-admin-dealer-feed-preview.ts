'use client'

import { useMutation } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { dealerFeedsAdminService } from '../services/dealer-feeds-admin.service'

export function useAdminDealerFeedPreview() {
  const {
    mutate: runAdminPreview,
    data: preview,
    isPending: isLoadingAdminPreview
  } = useMutation({
    mutationKey: ['admin-dealer-feed-preview'],
    mutationFn: (id: string) => dealerFeedsAdminService.preview(id),
    onError: toastMessageHandler
  })

  return { runAdminPreview, preview, isLoadingAdminPreview }
}
