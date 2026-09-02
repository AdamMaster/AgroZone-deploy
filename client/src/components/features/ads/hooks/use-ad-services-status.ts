'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adServicesService } from '../services'

// Без вебхука единственный способ узнать результат оплаты — перепроверить
// его вручную, когда пользователь возвращается с ЮKassa на страницу
// объявления с ?servicePurchase=<id> в урле (см. return_url в
// AdServicesService.createCheckout на бэкенде) — тот же приём, что и в
// use-bump-status.ts.
export function useAdServicesStatusCheck(adId: string) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const purchaseId = searchParams.get('servicePurchase')

  const { mutate: checkServicesStatus, isPending: isCheckingServicesStatus } = useMutation({
    mutationKey: ['ad-services-status', purchaseId],
    mutationFn: () => adServicesService.checkStatus(adId, purchaseId as string),

    onSuccess(purchase) {
      if (purchase.status === 'SUCCEEDED') {
        toast.success('Услуги подключены', {
          description: 'Изменения уже применены к объявлению'
        })
        queryClient.invalidateQueries({ queryKey: ['ad-public', adId] })
        queryClient.invalidateQueries({ queryKey: ['ad', adId] })
        queryClient.invalidateQueries({ queryKey: ['my-ads'] })
      } else if (purchase.status === 'CANCELED') {
        toast.error('Оплата не прошла', { description: 'Платёж отменён — услуги не подключены' })
      } else {
        toast.info('Платёж пока обрабатывается', {
          description: 'Если оплата прошла, услуги подключатся в течение пары минут'
        })
      }

      // ?servicePurchase=... не должен оставаться в адресной строке — иначе
      // повторный заход на страницу (или просто F5) будет заново дёргать
      // статус того же платежа.
      router.replace(`/ads/${adId}`)
    },

    onError(error) {
      toastMessageHandler(error)
      router.replace(`/ads/${adId}`)
    }
  })

  return { purchaseId, checkServicesStatus, isCheckingServicesStatus }
}
