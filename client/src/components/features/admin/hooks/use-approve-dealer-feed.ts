'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { dealerFeedsAdminService } from '../services/dealer-feeds-admin.service'

export function useApproveDealerFeed() {
  const queryClient = useQueryClient()

  const { mutate: approveDealerFeed, isPending: isApprovingDealerFeed } = useMutation({
    mutationKey: ['approve-dealer-feed'],
    mutationFn: (id: string) => dealerFeedsAdminService.approve(id),

    onSuccess() {
      toast.success('Фид одобрен')
      queryClient.invalidateQueries({ queryKey: ['admin-dealer-feeds-pending'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dealer-feeds'] })
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { approveDealerFeed, isApprovingDealerFeed }
}
