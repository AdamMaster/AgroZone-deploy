'use client'

import { useMutation } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { adServicesService } from '../services'
import { AdBadge, AdServiceType } from '../types/ad.types'

// Как и в use-bump-ad.ts — успешный ответ сразу уводит пользователя на
// оплату в ЮKassa, тут нет ни тоста, ни инвалидации кэша: реальный эффект
// применяется только после успешной оплаты, см. use-ad-services-status.ts.
export function useAdServicesCheckout(adId: string) {
  const { mutate: checkout, isPending: isLoadingCheckout } = useMutation({
    mutationKey: ['ad-services-checkout', adId],
    mutationFn: ({ services, badge }: { services: AdServiceType[]; badge?: AdBadge }) =>
      adServicesService.createCheckout(adId, services, badge),

    onSuccess({ confirmationUrl }) {
      window.location.href = confirmationUrl
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { checkout, isLoadingCheckout }
}
