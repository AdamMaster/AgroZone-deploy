'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { dealerFeedsService } from '../services'

export function useDealerFeedSync() {
  const queryClient = useQueryClient()

  const { mutate: syncDealerFeedNow, isPending: isSyncingDealerFeed } = useMutation({
    mutationKey: ['sync-dealer-feed'],
    mutationFn: () => dealerFeedsService.syncNow(),

    onSuccess() {
      toast.success('Синхронизация запущена', { description: 'Результат появится в статусе через пару минут' })
      queryClient.invalidateQueries({ queryKey: ['dealer-feed'] })
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { syncDealerFeedNow, isSyncingDealerFeed }
}
