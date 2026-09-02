'use client'

import { useEffect, useRef } from 'react'

import { useAdServicesStatusCheck } from '../hooks/use-ad-services-status'

// Невизуальный компонент, аналог BumpStatusHandler — рендерится на
// странице объявления и, если в урле есть ?servicePurchase=<id> (значит
// пользователь только что вернулся с оплаты услуг продвижения на странице
// "Поднять просмотры" — см. return_url в AdServicesService.createCheckout
// на бэкенде), ровно один раз запускает перепроверку статуса этого
// платежа. Права доступа проверяет сам бэкенд (checkStatus смотрит
// userId), так что рендерить его можно безусловно.
export const AdServicesStatusHandler = ({ adId }: { adId: string }) => {
  const { purchaseId, checkServicesStatus } = useAdServicesStatusCheck(adId)
  const hasCalled = useRef(false)

  useEffect(() => {
    if (purchaseId && !hasCalled.current) {
      hasCalled.current = true
      checkServicesStatus()
    }
  }, [purchaseId, checkServicesStatus])

  return null
}
