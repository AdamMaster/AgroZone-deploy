'use client'

import { useEffect, useRef } from 'react'

import { usePremiumStatusCheck } from '../hooks/use-premium-status'

// Невизуальный компонент, аналог BumpStatusHandler (client/features/ads):
// рендерится на странице премиума и, если в урле есть ?purchase=<id>
// (пользователь только что вернулся с оплаты в ЮKassa — см. return_url в
// createCheckout на бэкенде), ровно один раз запускает перепроверку
// статуса этого платежа.
export const PremiumStatusHandler = () => {
  const { purchaseId, checkPremiumStatus } = usePremiumStatusCheck()
  const hasCalled = useRef(false)

  useEffect(() => {
    if (purchaseId && !hasCalled.current) {
      hasCalled.current = true
      checkPremiumStatus()
    }
  }, [purchaseId, checkPremiumStatus])

  return null
}
