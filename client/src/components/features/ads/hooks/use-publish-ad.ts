'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services'

export function usePublishAd() {
  const queryClient = useQueryClient()

  const { mutate: publishAd, isPending: isLoadingPublish } = useMutation({
    mutationKey: ['publish ad'],
    mutationFn: (id: string) => adsService.publish(id),

    onSuccess() {
      toast.success('Объявление опубликовано')

      queryClient.invalidateQueries({
        queryKey: ['pending-ads']
      })

      queryClient.invalidateQueries({
        queryKey: ['published-ads']
      })

      // Без id: invalidateQueries матчит по префиксу, так что это разом
      // инвалидирует и ['ad-moderation', <любой id>] — если публикация
      // произошла со страницы предпросмотра модератора (см.
      // use-moderation-ad.ts), статус там обновится без ручного рефреша.
      queryClient.invalidateQueries({
        queryKey: ['ad-moderation']
      })
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return {
    publishAd,
    isLoadingPublish
  }
}
