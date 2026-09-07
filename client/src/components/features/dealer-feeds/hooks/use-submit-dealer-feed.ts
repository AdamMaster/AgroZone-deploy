'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { dealerFeedsService } from '../services'

export function useSubmitDealerFeed() {
  const queryClient = useQueryClient()

  const { mutate: submitDealerFeed, isPending: isSubmittingDealerFeed } = useMutation({
    mutationKey: ['submit-dealer-feed'],
    mutationFn: (url: string) => dealerFeedsService.submit(url),

    onSuccess() {
      toast.success('Фид отправлен на проверку', {
        description: 'Мы посмотрим ссылку и одобрим доступ, если всё в порядке'
      })
      queryClient.invalidateQueries({ queryKey: ['dealer-feed'] })
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { submitDealerFeed, isSubmittingDealerFeed }
}
