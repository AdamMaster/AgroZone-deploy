'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { premiumService } from '../services'

// Тот же паттерн, что и useBumpStatusCheck (client/features/ads) — без
// вебхука (ngrok заблокирован в РФ, см. premium.service.ts на бэкенде)
// единственный способ узнать результат оплаты — перепроверить его
// вручную, когда пользователь возвращается с ЮKassa на страницу премиума
// с ?purchase=<id> в урле (см. return_url в createCheckout на бэкенде).
export function usePremiumStatusCheck() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const purchaseId = searchParams.get('purchase')

  const { mutate: checkPremiumStatus, isPending: isCheckingPremiumStatus } = useMutation({
    mutationKey: ['premium-status', purchaseId],
    mutationFn: () => premiumService.checkStatus(purchaseId as string),

    onSuccess(purchase) {
      if (purchase.status === 'SUCCEEDED') {
        toast.success('Премиум активирован', {
          description: 'Все ваши объявления подняты в поиске и теперь поднимаются автоматически каждый день'
        })
        // ['profile'] — premiumUntil приходит в составе профиля, отдельного
        // кэша под премиум нет. ['my-ads'] — при покупке премиума бэкенд
        // сразу поднимает (bumpedAt) все опубликованные объявления
        // пользователя (см. PremiumService.reconcilePayment), список "мои
        // объявления" должен это увидеть без ручного обновления страницы.
        queryClient.invalidateQueries({ queryKey: ['profile'] })
        queryClient.invalidateQueries({ queryKey: ['my-ads'] })
      } else if (purchase.status === 'CANCELED') {
        toast.error('Оплата не прошла', { description: 'Платёж отменён — премиум не активирован' })
      } else {
        toast.info('Платёж пока обрабатывается', {
          description: 'Если оплата прошла, премиум активируется в течение пары минут'
        })
      }

      // ?purchase=... не должен оставаться в адресной строке — иначе
      // повторный заход на страницу (или просто F5) будет заново дёргать
      // статус того же платежа.
      router.replace('/profile/settings/premium')
    },

    onError(error) {
      toastMessageHandler(error)
      router.replace('/profile/settings/premium')
    }
  })

  return { purchaseId, checkPremiumStatus, isCheckingPremiumStatus }
}
