'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { dealerFeedsService } from '../services'

export function useDealerFeedResume() {
  const queryClient = useQueryClient()

  const { mutate: resumeDealerFeed, isPending: isResumingDealerFeed } = useMutation({
    mutationKey: ['resume-dealer-feed'],
    mutationFn: () => dealerFeedsService.resume(),

    onSuccess() {
      toast.success('Синхронизация возобновлена')
      queryClient.invalidateQueries({ queryKey: ['dealer-feed'] })
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { resumeDealerFeed, isResumingDealerFeed }
}
