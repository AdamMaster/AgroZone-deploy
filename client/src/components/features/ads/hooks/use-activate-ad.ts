'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services'

export function useActivateAd() {
  const queryClient = useQueryClient()

  const { mutate: activateAd, isPending: isLoadingActivate } = useMutation({
    mutationKey: ['activate ad'],
    mutationFn: (id: string) => adsService.activate(id),

    onSuccess() {
      toast.success('Объявление отправлено на модерацию')

      queryClient.invalidateQueries({
        queryKey: ['my-ads']
      })

      queryClient.invalidateQueries({
        queryKey: ['pending-ads']
      })
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return {
    activateAd,
    isLoadingActivate
  }
}
