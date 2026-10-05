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

    onSuccess(_data, id) {
      toast.success('Объявление отправлено на модерацию')

      queryClient.invalidateQueries({
        queryKey: ['my-ads']
      })

      queryClient.invalidateQueries({
        queryKey: ['pending-ads']
      })

      queryClient.invalidateQueries({ queryKey: ['ad', id] })
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
