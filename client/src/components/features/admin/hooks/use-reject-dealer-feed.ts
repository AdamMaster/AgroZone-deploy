'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { dealerFeedsAdminService } from '../services/dealer-feeds-admin.service'

export function useRejectDealerFeed() {
  const queryClient = useQueryClient()

  const { mutate: rejectDealerFeed, isPending: isRejectingDealerFeed } = useMutation({
    mutationKey: ['reject-dealer-feed'],
    mutationFn: ({ id, reason }: { id: string; reason: string }) => dealerFeedsAdminService.reject(id, reason),

    onSuccess() {
      toast.success('Фид отклонён')
      queryClient.invalidateQueries({ queryKey: ['admin-dealer-feeds-pending'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dealer-feeds'] })
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { rejectDealerFeed, isRejectingDealerFeed }
}
