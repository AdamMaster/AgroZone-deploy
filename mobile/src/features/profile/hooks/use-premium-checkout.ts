import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner-native'

import { profileQueryKey } from '@/features/auth/store/auth-store'

import { type PaymentStatus, awaitPaymentResult } from '@/lib/payments/await-payment-result'
import { createPaymentReturnUri, openCheckoutPage } from '@/lib/payments/checkout-browser'
import { showError } from '@/lib/ui/show-error'

import { premiumApi } from '../api/premium.api'

// Если пользователь закрыл окно оплаты, не дойдя до конца, хватит одной
// проверки (оплатить он мог и успеть закрыть окно). Проверка спрашивает
// ЮKassa напрямую, поэтому оплаченный платёж она увидит сразу.
const CLOSED_BROWSER_ATTEMPTS = 1

// Оплата премиума из приложения: сервер создаёт платёж, пользователь платит
// в ЮKassa и возвращается в приложение, дальше результат перепроверяется у
// сервера и показывается уведомлением.
export function usePremiumCheckout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['premium-checkout'],
    // null — пользователь закрыл окно оплаты и ничего не оплатил: сообщать
    // нечего.
    mutationFn: async (): Promise<PaymentStatus | null> => {
      const returnUri = createPaymentReturnUri()
      const { confirmationUrl, purchaseId } = await premiumApi.createCheckout(returnUri)
      const browserResult = await openCheckoutPage(confirmationUrl, returnUri)

      const status = await awaitPaymentResult(async () => (await premiumApi.fetchPurchase(purchaseId)).status, {
        attempts: browserResult === 'closed' ? CLOSED_BROWSER_ATTEMPTS : undefined
      })

      return status === 'PENDING' && browserResult === 'closed' ? null : status
    },

    onSuccess(status) {
      if (status === null) return

      if (status === 'SUCCEEDED') {
        toast.success('Премиум активирован', {
          description: 'Все ваши объявления подняты в поиске и теперь поднимаются автоматически каждый день'
        })
      } else if (status === 'CANCELED') {
        toast.error('Оплата не прошла', { description: 'Платёж отменён — премиум не активирован' })
      } else {
        toast.info('Платёж пока обрабатывается', {
          description: 'Если оплата прошла, премиум активируется в течение пары минут'
        })
      }

      // Срок премиума приходит в профиле; при покупке сервер сразу поднимает
      // все опубликованные объявления, поэтому обновляем и их.
      void queryClient.invalidateQueries({ queryKey: profileQueryKey })
      void queryClient.invalidateQueries({ queryKey: ['ads'] })
    },

    onError: showError
  })
}
