'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services'

export function useArchiveAd() {
  const queryClient = useQueryClient()

  const { mutate: archiveAd, isPending: isLoadingArchive } = useMutation({
    mutationKey: ['archive ad'],
    mutationFn: (id: string) => adsService.archive(id),

    onSuccess(_data, id) {
      toast.success('Объявление перенесено в архив', {
        description: 'Его можно восстановить в течение 30 дней, затем оно удалится'
      })

      queryClient.invalidateQueries({
        queryKey: ['my-ads']
      })

      queryClient.invalidateQueries({
        queryKey: ['published-ads']
      })

      queryClient.invalidateQueries({
        queryKey: ['archived-ads']
      })

      queryClient.invalidateQueries({ queryKey: ['ad', id] })
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return {
    archiveAd,
    isLoadingArchive
  }
}
