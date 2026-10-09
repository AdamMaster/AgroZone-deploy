import * as WebBrowser from 'expo-web-browser'

import { SITE_URL } from '@/config/env'

// Страницы сайта (правила, политика) открываем во встроенном браузере
// поверх приложения — пользователь возвращается к форме одним жестом.
export function openSitePage(path: `/${string}`) {
  return WebBrowser.openBrowserAsync(`${SITE_URL}${path}`)
}
