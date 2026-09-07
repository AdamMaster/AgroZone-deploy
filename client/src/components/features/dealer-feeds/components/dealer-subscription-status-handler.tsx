'use client'

import { useEffect, useRef } from 'react'

import { useDealerSubscriptionStatusCheck } from '../hooks'

// Невизуальный компонент, аналог PremiumStatusHandler
// (client/features/user): рендерится на странице фидов и, если в урле
// есть ?subscription=<id> (дилер только что вернулся с оплаты в ЮKassa —
// см. return_url в DealerSubscriptionsService.createCheckout на бэкенде),
// ровно один раз запускает перепроверку статуса этого платежа.
export const DealerSubscriptionStatusHandler = () => {
  const { subscriptionId, checkSubscriptionStatus } = useDealerSubscriptionStatusCheck()
  const hasCalled = useRef(false)

  useEffect(() => {
    if (subscriptionId && !hasCalled.current) {
      hasCalled.current = true
      checkSubscriptionStatus()
    }
  }, [subscriptionId, checkSubscriptionStatus])

  return null
}
