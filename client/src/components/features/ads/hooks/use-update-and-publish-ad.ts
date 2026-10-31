'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adsService } from '../services'

// «Сохранить и опубликовать» для черновика, архивного и истёкшего объявления:
// сначала правки (PATCH /ads/:id), затем отправка на модерацию (activate). Если
// вторая часть не прошла, правки уже сохранены — человек увидит ошибку
// (например, не заполнено обязательное поле) и сможет опубликовать позже из
// «Моих объявлений».
export function useUpdateAndPublishAd(id: string) {
  const queryClient = useQueryClient()
  const router = useRouter()

  const { mutate: updateAndPublishAd, isPending: isLoadingUpdateAndPublish } = useMutation({
    mutationKey: ['update and publish ad', id],
    mutationFn: async (data: FormData) => {
      await adsService.update(id, data)
      await adsService.activate(id)
    },
    onSuccess() {
      toast.success('Объявление отправлено на модерацию', {
        description: 'Модератор проверит его, обычно это занимает около 15 минут'
      })

      queryClient.invalidateQueries({ queryKey: ['my-ads'] })
      queryClient.invalidateQueries({ queryKey: ['pending-ads'] })
      queryClient.invalidateQueries({ queryKey: ['ad', id] })
      router.push('/profile/settings/ads')
    },
    onError(error) {
      // Правки могли сохраниться, даже если отправка на модерацию не прошла.
      queryClient.invalidateQueries({ queryKey: ['my-ads'] })
      queryClient.invalidateQueries({ queryKey: ['ad', id] })
      toastMessageHandler(error)
    }
  })

  return { updateAndPublishAd, isLoadingUpdateAndPublish }
}
