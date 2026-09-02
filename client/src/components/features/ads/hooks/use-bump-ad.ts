'use client'

import { useMutation } from '@tanstack/react-query'

import { toastMessageHandler } from '@/shared/utils'

import { adBumpsService } from '../services'

// Успешный ответ уводит пользователя со страницы на оплату в ЮKassa — тут
// нет ни тоста, ни инвалидации кэша: сам факт перехода на оплату ещё
// ничего не поднимает. Дальнейшая обработка — после возврата, см.
// use-bump-status.ts.
export function useBumpAd() {
  const { mutate: bumpAd, isPending: isLoadingBump } = useMutation({
    mutationKey: ['bump-ad'],
    mutationFn: (adId: string) => adBumpsService.createCheckout(adId),

    onSuccess({ confirmationUrl }) {
      window.location.href = confirmationUrl
    },

    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { bumpAd, isLoadingBump }
}
