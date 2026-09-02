'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services'

export function useRemoveAd() {
  const queryClient = useQueryClient()

  const { mutate: removeAd, isPending: isLoadingRemove } = useMutation({
    mutationKey: ['remove ad'],
    mutationFn: (id: string) => adsService.remove(id),
    onSuccess() {
      toast.success('Объявление успешно удалено!')
      queryClient.invalidateQueries({ queryKey: ['my-ads'] })
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return {
    removeAd,
    isLoadingRemove
  }
}
