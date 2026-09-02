'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services'

interface UpdateAdVariables {
  data: FormData
  // Было ли объявление REJECTED до этого сохранения — сервер в этом
  // случае сам переводит его обратно в PENDING (см. AdsService.update), и
  // тост должен честно сказать, что оно ушло на повторную проверку, а не
  // просто "обновлено", как будто ничего особенного не произошло (см.
  // обсуждение с пользователем).
  wasRejected?: boolean
}

export function useUpdateAd(id: string) {
  const queryClient = useQueryClient()
  const router = useRouter()

  const { mutate, isPending: isLoadingUpdate } = useMutation({
    mutationKey: ['update ad', id],
    mutationFn: ({ data }: UpdateAdVariables) => adsService.update(id, data),
    onSuccess(_updatedAd, variables) {
      if (variables.wasRejected) {
        toast.success('Объявление отправлено на повторную проверку', {
          description: 'Модератор рассмотрит его ещё раз, обычно это занимает около 15 минут'
        })
      } else {
        toast.success('Объявление успешно обновлено!')
      }

      queryClient.invalidateQueries({ queryKey: ['my-ads'] })
      queryClient.invalidateQueries({ queryKey: ['ad', id] })
      router.push('/profile/settings/ads')
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  const updateAd = (data: FormData, wasRejected?: boolean) => mutate({ data, wasRejected })

  return { updateAd, isLoadingUpdate }
}
