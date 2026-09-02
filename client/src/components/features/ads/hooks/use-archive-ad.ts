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

    onSuccess() {
      toast.success('Объявление перенесено в архив')

      queryClient.invalidateQueries({
        queryKey: ['my-ads']
      })

      queryClient.invalidateQueries({
        queryKey: ['published-ads']
      })

      queryClient.invalidateQueries({
        queryKey: ['archived-ads']
      })
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
