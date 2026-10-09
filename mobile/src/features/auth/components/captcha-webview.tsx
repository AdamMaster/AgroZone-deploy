import * as Linking from 'expo-linking'
import { useMemo } from 'react'
import { WebView, type WebViewMessageEvent } from 'react-native-webview'

import { SITE_URL, YANDEX_CAPTCHA_SITEKEY } from '@/config/env'

interface CaptchaWebViewProps {
  onToken: (token: string) => void
  onError: () => void
}

type CaptchaMessage = { type: 'token'; token: string } | { type: 'error' }

// Сколько ждать загрузки скрипта капчи, прежде чем сказать, что она не
// загрузилась (плохая сеть, блокировка).
const CAPTCHA_LOAD_TIMEOUT_MS = 15_000

// Страница с виджетом Яндекс SmartCaptcha («Я не робот»). Нативной версии
// капчи у Яндекса нет, поэтому показываем ту же веб-капчу, что на сайте,
// во встроенном окне. Страница открывается от имени домена сайта (baseUrl):
// клиентский ключ капчи привязан к нему. Токен уходит в приложение через
// postMessage, а приложение передаёт его серверу так же, как сайт.
function buildCaptchaHtml(sitekey: string) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;padding:0;background:transparent}#captcha{padding:8px}</style>
<script src="https://smartcaptcha.cloud.yandex.ru/captcha.js?render=onload&onload=onCaptchaLoad" defer></script>
</head>
<body>
<div id="captcha"></div>
<script>
function send(message) { window.ReactNativeWebView.postMessage(JSON.stringify(message)) }
window.onCaptchaLoad = function () {
  window.smartCaptcha.render('captcha', {
    sitekey: ${JSON.stringify(sitekey)},
    hl: 'ru',
    callback: function (token) { send({ type: 'token', token: token }) }
  })
}
setTimeout(function () { if (!window.smartCaptcha) send({ type: 'error' }) }, ${CAPTCHA_LOAD_TIMEOUT_MS})
</script>
</body>
</html>`
}

function parseMessage(data: string): CaptchaMessage | null {
  try {
    const message = JSON.parse(data) as Partial<CaptchaMessage>

    if (message.type === 'token' && typeof message.token === 'string' && message.token) {
      return { type: 'token', token: message.token }
    }

    return message.type === 'error' ? { type: 'error' } : null
  } catch {
    return null
  }
}

export function CaptchaWebView({ onToken, onError }: CaptchaWebViewProps) {
  const source = useMemo(() => ({ html: buildCaptchaHtml(YANDEX_CAPTCHA_SITEKEY), baseUrl: SITE_URL }), [])

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = parseMessage(event.nativeEvent.data)

    if (message?.type === 'token') onToken(message.token)
    if (message?.type === 'error') onError()
  }

  return (
    <WebView
      source={source}
      originWhitelist={['https://*', 'about:*']}
      onMessage={handleMessage}
      onError={onError}
      onHttpError={event => {
        // Ошибка самой страницы капчи, а не картинок внутри неё.
        if (event.nativeEvent.url.includes('smartcaptcha')) onError()
      }}
      // Ссылки внутри виджета (условия Яндекса и т.п.) открываем в обычном
      // браузере, а не внутри окна капчи. Фреймы самой капчи не трогаем.
      onShouldStartLoadWithRequest={request => {
        const isOwnPage = request.url === 'about:blank' || request.url.startsWith(SITE_URL)

        if (!request.isTopFrame || isOwnPage) return true

        void Linking.openURL(request.url)
        return false
      }}
      setSupportMultipleWindows={false}
      style={{ backgroundColor: 'transparent' }}
    />
  )
}
