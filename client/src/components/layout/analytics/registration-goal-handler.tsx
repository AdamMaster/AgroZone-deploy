'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { METRIKA_GOALS, reachGoal } from '@/shared/utils'

// Невизуальный компонент, тот же паттерн, что PremiumStatusHandler
// (components/features/user) — рендерится на /profile/settings/general,
// куда редиректит бэкенд после OAuth-колбэка (см. AuthController.callback
// в server/src/auth/auth.controller.ts), и если в урле есть ?newUser=1
// (аккаунт только что создан именно этим входом через Google/Яндекс — см.
// AuthService.extractProfileFromCode), ровно один раз отправляет цель
// "registration" в Яндекс.Метрику (F15 в ROADMAP.md).
//
// Нужен отдельно от reachGoal в use-register-mutation.ts/
// use-register-sms-mutation.ts, потому что у входа через соцсеть нет
// отдельного клиентского onSuccess — это full-page редирект с бэкенда,
// а не React-мутация.
export const RegistrationGoalHandler = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hasHandled = useRef(false)

  useEffect(() => {
    if (hasHandled.current) return
    if (searchParams.get('newUser') !== '1') return

    hasHandled.current = true
    reachGoal(METRIKA_GOALS.REGISTRATION)

    // ?newUser=1 не должен оставаться в адресной строке — иначе обычный
    // F5 или заход по сохранённой ссылке заново засчитает цель.
    router.replace('/profile/settings/general')
  }, [router, searchParams])

  return null
}
