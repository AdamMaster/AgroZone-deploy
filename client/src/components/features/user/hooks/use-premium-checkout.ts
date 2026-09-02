'use client'

import { useMutation } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { premiumService } from '../services'

// Тот же паттерн, что и useBumpAd (client/features/ads) — успешный ответ
// уводит пользователя на оплату в ЮKassa, тут нет ни тоста, ни
// инвалидации кэша: сам факт перехода на оплату ещё ничего не даёт.
// Дальнейшая обработка — после возврата, см. use-premium-status.ts.
export function usePremiumCheckout() {
  const { mutate: startPremiumCheckout, isPending: isStartingPremiumCheckout } = useMutation({
    mutationKey: ['premium-checkout'],
    mutationFn: () => premiumService.createCheckout(),

    onSuccess({ confirmationUrl }) {
      window.location.href = confirmationUrl
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { startPremiumCheckout, isStartingPremiumCheckout }
}
