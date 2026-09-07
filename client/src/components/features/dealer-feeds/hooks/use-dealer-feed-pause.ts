'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { dealerFeedsService } from '../services'

export function useDealerFeedPause() {
  const queryClient = useQueryClient()

  const { mutate: pauseDealerFeed, isPending: isPausingDealerFeed } = useMutation({
    mutationKey: ['pause-dealer-feed'],
    mutationFn: () => dealerFeedsService.pause(),

    onSuccess() {
      toast.success('Синхронизация приостановлена')
      queryClient.invalidateQueries({ queryKey: ['dealer-feed'] })
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { pauseDealerFeed, isPausingDealerFeed }
}
