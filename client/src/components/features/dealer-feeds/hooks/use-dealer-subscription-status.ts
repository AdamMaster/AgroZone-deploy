'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { dealerFeedsService } from '../services'

// Тот же паттерн, что и usePremiumStatusCheck (client/features/user) — без
// вебхука единственный надёжный способ узнать результат оплаты на этой
// странице — перепроверить его вручную, когда дилер возвращается с ЮKassa
// с ?subscription=<id> в урле (см. return_url в
// DealerSubscriptionsService.createCheckout на бэкенде).
export function useDealerSubscriptionStatusCheck() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const subscriptionId = searchParams.get('subscription')

  const { mutate: checkSubscriptionStatus, isPending: isCheckingSubscriptionStatus } = useMutation({
    mutationKey: ['dealer-subscription-status', subscriptionId],
    mutationFn: () => dealerFeedsService.checkSubscriptionStatus(subscriptionId as string),

    onSuccess(subscription) {
      if (subscription.status === 'SUCCEEDED') {
        toast.success('Тариф активирован', { description: 'Синхронизация фида начнётся по расписанию' })
        queryClient.invalidateQueries({ queryKey: ['dealer-feed'] })
      } else if (subscription.status === 'CANCELED') {
        toast.error('Оплата не прошла', { description: 'Платёж отменён — тариф не активирован' })
      } else {
        toast.info('Платёж пока обрабатывается', {
          description: 'Если оплата прошла, тариф активируется в течение пары минут'
        })
      }

      router.replace('/profile/settings/feeds')
    },

    onError(error) {
      toastMessageHandler(error)
      router.replace('/profile/settings/feeds')
    }
  })

  return { subscriptionId, checkSubscriptionStatus, isCheckingSubscriptionStatus }
}
