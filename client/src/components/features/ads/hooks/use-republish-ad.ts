'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services'
import { IUpdateAdDto } from '../types/ad.types'

export function useRepublishAd() {
  const queryClient = useQueryClient()

  const { mutate: republishAd, isPending: isLoadingRepublishAd } = useMutation({
    mutationKey: ['republish ad'],
    mutationFn: ({ id, data }: { id: string; data?: IUpdateAdDto }) => adsService.republish(id, data), // Теперь вызываем republish

    onSuccess() {
      toast.success('Объявление опубликовано')
      queryClient.invalidateQueries({ queryKey: ['my-ads'] })
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { republishAd, isLoadingRepublishAd }
}
