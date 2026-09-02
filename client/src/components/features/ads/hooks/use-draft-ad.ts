'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services'

export function useDraftAd() {
  const queryClient = useQueryClient()

  const { mutate: draftAd, isPending: isLoadingDraft } = useMutation({
    mutationKey: ['draft ad'],
    mutationFn: (id: string) => adsService.draft(id),

    onSuccess() {
      toast.success('Объявление сохранено в черновики')

      queryClient.invalidateQueries({
        queryKey: ['my-ads']
      })

      queryClient.invalidateQueries({
        queryKey: ['draft-ads']
      })

      queryClient.invalidateQueries({
        queryKey: ['rejected-ads']
      })
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return {
    draftAd,
    isLoadingDraft
  }
}
