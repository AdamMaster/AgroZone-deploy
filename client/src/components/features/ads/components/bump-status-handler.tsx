'use client'

import { useEffect, useRef } from 'react'

import { useBumpStatusCheck } from '../hooks/use-bump-status'

// Невизуальный компонент: рендерится на странице объявления и, если в урле
// есть ?bump=<id> (значит пользователь только что вернулся с оплаты в
// ЮKassa — см. return_url в createCheckout на бэкенде), ровно один раз
// запускает перепроверку статуса этого платежа. Права доступа проверяет
// сам бэкенд (checkStatus смотрит userId), так что рендерить его можно
// безусловно — у не-владельца просто ?bump в урле никогда не появится.
export const BumpStatusHandler = ({ adId }: { adId: string }) => {
  const { bumpId, checkBumpStatus } = useBumpStatusCheck(adId)
  const hasCalled = useRef(false)

  useEffect(() => {
    if (bumpId && !hasCalled.current) {
      hasCalled.current = true
      checkBumpStatus()
    }
  }, [bumpId, checkBumpStatus])

  return null
}
