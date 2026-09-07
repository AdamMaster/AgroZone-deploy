'use client'

import { useMutation } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { dealerFeedsService } from '../services'
import { DealerTier } from '../types/dealer-feed.types'

// Тот же паттерн, что и usePremiumCheckout (client/features/user) —
// успешный ответ сразу уводит на оплату в ЮKassa, никакого тоста тут не
// нужно. Дальнейшая обработка — после возврата, см.
// use-dealer-subscription-status.ts.
export function useDealerSubscriptionCheckout() {
  const { mutate: startSubscriptionCheckout, isPending: isStartingSubscriptionCheckout } = useMutation({
    mutationKey: ['dealer-subscription-checkout'],
    mutationFn: (tier: DealerTier) => dealerFeedsService.createSubscriptionCheckout(tier),

    onSuccess({ confirmationUrl }) {
      window.location.href = confirmationUrl
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { startSubscriptionCheckout, isStartingSubscriptionCheckout }
}
