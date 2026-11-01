import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner-native'

import { type PaymentStatus, awaitPaymentResult } from '@/lib/payments/await-payment-result'
import { createPaymentReturnUri, openCheckoutPage } from '@/lib/payments/checkout-browser'
import { showError } from '@/lib/ui/show-error'

import { adServicesApi } from '../api/ad-services.api'
import type { AdServiceCheckoutParams } from '../types/promote-ad.types'

// Если пользователь закрыл окно оплаты, не дойдя до конца, ждать
// подтверждения долго нет смысла: хватит одной проверки (оплатить он мог и
// успеть закрыть окно). Проверка спрашивает ЮKassa напрямую, поэтому
// оплаченный платёж она увидит сразу.
const CLOSED_BROWSER_ATTEMPTS = 1

// Оплата услуг: сервер создаёт платёж, пользователь платит в ЮKassa и
// возвращается в приложение, дальше результат перепроверяется у сервера и
// показывается уведомлением. Оплата идёт внутри приложения: ни сайт, ни
// вход на сайте не нужны.
export function useAdServicesCheckout(adId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['ad-services-checkout', adId],
    // null — пользователь закрыл окно оплаты и ничего не оплатил: сообщать
    // нечего.
    mutationFn: async (params: AdServiceCheckoutParams): Promise<PaymentStatus | null> => {
      const returnUri = createPaymentReturnUri()
      const { confirmationUrl, purchaseId } = await adServicesApi.createCheckout(adId, params, returnUri)
      const browserResult = await openCheckoutPage(confirmationUrl, returnUri)

      const status = await awaitPaymentResult(
        async () => (await adServicesApi.fetchPurchase(adId, purchaseId)).status,
        {
          attempts: browserResult === 'closed' ? CLOSED_BROWSER_ATTEMPTS : undefined
        }
      )

      return status === 'PENDING' && browserResult === 'closed' ? null : status
    },

    onSuccess(status) {
      if (status === null) return

      if (status === 'SUCCEEDED') {
        toast.success('Услуги подключены', { description: 'Изменения уже применены к объявлению' })
      } else if (status === 'CANCELED') {
        toast.error('Оплата не прошла', { description: 'Платёж отменён — услуги не подключены' })
      } else {
        toast.info('Платёж пока обрабатывается', {
          description: 'Если оплата прошла, услуги подключатся в течение пары минут'
        })
      }

      // Значок, выделенная цена и порядок видны в ленте, «Мои объявления» и
      // на самой странице объявления: перезапрашиваем все объявления разом.
      void queryClient.invalidateQueries({ queryKey: ['ads'] })
    },

    onError: showError
  })
}
