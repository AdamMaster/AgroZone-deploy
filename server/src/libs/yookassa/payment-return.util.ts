import { BadRequestException } from '@nestjs/common'

import { appendQuery, isAllowedMobileRedirectUri } from '@/auth/mobile-oauth/mobile-oauth.service'

// Путь, на который ЮKassa возвращает пользователя из приложения (см.
// YookassaWebhookController.returnToApp): сервер сам перенаправляет его в
// приложение. ЮKassa принимает в качестве адреса возврата только обычную
// https-ссылку, а адреса вида agrozone://… знает лишь приложение.
export const PAYMENT_APP_RETURN_PATH = '/payments/yookassa/return'

// Адрес возврата в приложение допустим, только если у него разрешённая
// схема (та же проверка, что и при входе через Яндекс из приложения).
// Вызывать нужно ДО создания записи о платеже: иначе при ошибке в базе
// останется зависшая запись PENDING.
export function assertAppReturnUri(returnUri: string | undefined): void {
  if (returnUri !== undefined && !isAllowedMobileRedirectUri(returnUri)) {
    throw new BadRequestException('Недопустимый адрес возврата в приложение.')
  }
}

interface ReturnUrlOptions {
  // Куда вернуть на сайте (запрос с сайта).
  webReturnUrl: string
  // Адрес возврата в приложение (запрос из приложения), уже проверенный
  // assertAppReturnUri.
  appReturnUri: string | undefined
  // Адрес самого сервера (APPLICATION_URL), а не сайта.
  backendOrigin: string
  purchaseId: string
}

// Адрес, который передаётся ЮKassa как return_url.
export function buildReturnUrl({ webReturnUrl, appReturnUri, backendOrigin, purchaseId }: ReturnUrlOptions): string {
  if (!appReturnUri) {
    return webReturnUrl
  }

  return appendQuery(`${backendOrigin}${PAYMENT_APP_RETURN_PATH}`, { to: appReturnUri, purchase: purchaseId })
}
