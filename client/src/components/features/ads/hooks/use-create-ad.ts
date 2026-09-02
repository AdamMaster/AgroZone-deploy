'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services/ads.service'

export function useCreateAd() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const { mutate: createAd, isPending: isLoadingCreate } = useMutation({
    mutationKey: ['create ad'],
    mutationFn: (data: FormData) => adsService.create(data),
    onSuccess() {
      toast.success('Объявление успешно создано!')
      queryClient.invalidateQueries({ queryKey: ['my-ads'] })
      // Если нужно обновить список всех объявлений:
      // queryClient.invalidateQueries({ queryKey: ['ads'] })

      router.push('/profile/settings/ads')
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { createAd, isLoadingCreate }
}
