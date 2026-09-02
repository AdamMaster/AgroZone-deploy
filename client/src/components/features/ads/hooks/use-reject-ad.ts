'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services'

export function useRejectAd() {
  const queryClient = useQueryClient()

  const { mutate: rejectAd, isPending: isLoadingReject } = useMutation({
    mutationKey: ['reject ad'],
    mutationFn: ({ id, reason }: { id: string; reason: string }) => adsService.reject(id, reason),

    onSuccess() {
      toast.success('Объявление отклонено')

      queryClient.invalidateQueries({
        queryKey: ['pending-ads']
      })

      queryClient.invalidateQueries({
        queryKey: ['rejected-ads']
      })

      // См. use-publish-ad.ts — та же причина, тот же приём.
      queryClient.invalidateQueries({
        queryKey: ['ad-moderation']
      })
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return {
    rejectAd,
    isLoadingReject
  }
}
