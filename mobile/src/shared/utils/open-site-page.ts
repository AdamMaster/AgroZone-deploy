import * as WebBrowser from 'expo-web-browser'

import { SITE_URL } from '@/config/env'

// Страницы сайта (правила, политика, оплата услуг) открываем во встроенном
// браузере поверх приложения — пользователь возвращается назад одним жестом.
export function openSitePage(path: `/${string}`) {
  return WebBrowser.openBrowserAsync(`${SITE_URL}${path}`)
}
