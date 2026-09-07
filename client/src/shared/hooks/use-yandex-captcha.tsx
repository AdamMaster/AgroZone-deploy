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
  // Баг: "ввёл неверный пароль, потом верный — вход не происходит" (см.
  // обсуждение с пользователем) был именно тут. InvisibleSmartCaptcha
  // (node_modules/@yandex/smart-captcha/index.js) вызывает
  // smartCaptcha.execute(widgetId) внутри useEffect по смене visible, но
  // НИГДЕ не вызывает smartCaptcha.reset(widgetId) между исполнениями —
  // ни сама библиотека, ни этот хук раньше. После первого успешного
  // executeCaptcha() (даже если сам логин потом не прошёл из-за пароля)
  // виджет уже выдал токен и на второй execute() с тем же смонтированным
  // widgetId просто не перевыполняет проверку — событие success (и
  // challenge-hidden тоже) больше не приходит вообще. Promise из второго
  // executeCaptcha() зависал навсегда, await в onSubmit (form-login.tsx и
  // остальных пяти форм, использующих этот хук) никогда не возвращался,
  // login()/register() и т.п. просто не вызывались — форма молча
  // переставала реагировать на клик, без единой ошибки на экране.
  //
  // Прямого доступа к smartCaptcha.reset(widgetId) у нас нет — widgetId
  // живёт внутри InvisibleSmartCaptcha и наружу не прокидывается (ни
  // пропом, ни через ref). Пересобираем виджет целиком через смену key —
  // это то же самое, что и unmount/remount: сработает cleanup самого
  // компонента (smartCaptcha.destroy(id), см. index.js), а следом —
  // свежий render() с новым widgetId, то есть эффективный reset публичным
  // API компонента, без обращения к внутренностям библиотеки напрямую.
  const [resetKey, setResetKey] = useState(0)
  const resolveRef = useRef<((token: string) => void) | null>(null)
  const rejectRef = useRef<((reason: Error) => void) | null>(null)

  const settle = () => {
    resolveRef.current = null
    rejectRef.current = null
    setVisible(false)
    setResetKey(key => key + 1)
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
      // key — см. комментарий выше про resetKey: без него это был бы тот
      // же смонтированный виджет, и вторая проверка подряд молча зависала
      // бы.
      key={resetKey}
      sitekey={process.env.NEXT_PUBLIC_YANDEX_CAPTCHA_CLIENT_KEY as string}
      visible={visible}
      onSuccess={handleSuccess}
      onChallengeHidden={handleChallengeHidden}
    />
  )

  return { executeCaptcha, CaptchaWidget }
}
