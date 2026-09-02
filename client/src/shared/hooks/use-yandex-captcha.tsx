'use client'

import { useCallback, useRef, useState } from 'react'
import { InvisibleSmartCaptcha } from '@yandex/smart-captcha'

/**
 * Обёртка над InvisibleSmartCaptcha (Яндекс) с API, повторяющим
 * executeRecaptcha() из react-google-recaptcha-v3: вызываешь executeCaptcha()
 * и получаешь Promise<string> с токеном. { CaptchaWidget } нужно один раз
 * вставить в JSX формы — сам виджет невидим и просто держит состояние.
 */
export function useYandexCaptcha() {
  const [visible, setVisible] = useState(false)
  const resolveRef = useRef<((token: string) => void) | null>(null)
  const rejectRef = useRef<((reason: Error) => void) | null>(null)

  const settle = () => {
    resolveRef.current = null
    rejectRef.current = null
    setVisible(false)
  }

  const handleSuccess = useCallback((token: string) => {
    const resolve = resolveRef.current
    settle()
    resolve?.(token)
  }, [])

  const handleChallengeHidden = useCallback(() => {
    // Попап проверки закрылся без успеха (пользователь не прошёл проверку) —
    // токена не будет, отклоняем ожидание.
    const reject = rejectRef.current
    if (reject) {
      settle()
      reject(new Error('Проверка капчи не пройдена'))
    }
  }, [])

  const executeCaptcha = useCallback(() => {
    return new Promise<string>((resolve, reject) => {
      resolveRef.current = resolve
      rejectRef.current = reject
      setVisible(true)
    })
  }, [])

  const CaptchaWidget = (
    <InvisibleSmartCaptcha
      sitekey={process.env.NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY as string}
      visible={visible}
      onSuccess={handleSuccess}
      onChallengeHidden={handleChallengeHidden}
    />
  )

  return { executeCaptcha, CaptchaWidget }
}
