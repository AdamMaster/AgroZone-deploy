'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { adBumpsService } from '../services'

// Без вебхука (ngrok заблокирован в РФ — см. ad-bumps.service.ts на
// бэкенде) единственный способ узнать результат оплаты — перепроверить его
// вручную, когда пользователь возвращается с ЮKassa на страницу объявления
// с ?bump=<id> в урле (см. return_url в createCheckout на бэкенде).
export function useBumpStatusCheck(adId: string) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const bumpId = searchParams.get('bump')

  const { mutate: checkBumpStatus, isPending: isCheckingBumpStatus } = useMutation({
    mutationKey: ['bump-status', bumpId],
    mutationFn: () => adBumpsService.checkStatus(adId, bumpId as string),

    onSuccess(bump) {
      if (bump.status === 'SUCCEEDED') {
        toast.success('Объявление поднято в поиске', {
          description: 'Услуга активна 7 дней — всё это время объявление будет каждый день само подниматься в топ'
        })
        queryClient.invalidateQueries({ queryKey: ['ad-public', adId] })
        queryClient.invalidateQueries({ queryKey: ['my-ads'] })
      } else if (bump.status === 'CANCELED') {
        toast.error('Оплата не прошла', { description: 'Платёж отменён — объявление не поднято' })
      } else {
        toast.info('Платёж пока обрабатывается', {
          description: 'Если оплата прошла, объявление поднимется в течение пары минут'
        })
      }

      // ?bump=... не должен оставаться в адресной строке — иначе повторный
      // заход на страницу (или просто F5) будет заново дёргать статус того
      // же платежа.
      router.replace(`/ads/${adId}`)
    },

    onError(error) {
      toastMessageHandler(error)
      router.replace(`/ads/${adId}`)
    }
  })

  return { bumpId, checkBumpStatus, isCheckingBumpStatus }
}
