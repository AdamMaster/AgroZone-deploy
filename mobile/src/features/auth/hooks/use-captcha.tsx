import { useCallback, useRef, useState } from 'react'

import { CaptchaModal } from '../components/captcha-modal'

// Пользователь закрыл окно капчи — форма просто ничего не делает, это не
// ошибка, которую нужно показывать.
export class CaptchaCancelledError extends Error {
  constructor() {
    super('Проверка отменена')
    this.name = 'CaptchaCancelledError'
  }
}

// requestCaptcha() открывает окно капчи и возвращает Promise с токеном —
// тот же приём, что useYandexCaptcha на сайте. captchaModal нужно один раз
// отрисовать в разметке экрана.
export function useCaptcha() {
  const [isVisible, setIsVisible] = useState(false)
  const pendingRef = useRef<{ resolve: (token: string) => void; reject: (error: Error) => void } | null>(null)

  const settle = useCallback(() => {
    pendingRef.current = null
    setIsVisible(false)
  }, [])

  const requestCaptcha = useCallback(
    () =>
      new Promise<string>((resolve, reject) => {
        pendingRef.current = { resolve, reject }
        setIsVisible(true)
      }),
    []
  )

  const handleToken = useCallback(
    (token: string) => {
      const pending = pendingRef.current
      settle()
      pending?.resolve(token)
    },
    [settle]
  )

  const handleCancel = useCallback(() => {
    const pending = pendingRef.current
    settle()
    pending?.reject(new CaptchaCancelledError())
  }, [settle])

  const captchaModal = <CaptchaModal visible={isVisible} onToken={handleToken} onCancel={handleCancel} />

  return { requestCaptcha, captchaModal }
}
