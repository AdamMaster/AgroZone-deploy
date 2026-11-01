import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'

// Адрес, на который сервер вернёт пользователя после оплаты:
// agrozone://payment-return в собранном приложении, exp://…/--/payment-return
// в Expo Go. Экран-приёмник — app/payment-return.tsx.
const PAYMENT_RETURN_PATH = 'payment-return'

export const createPaymentReturnUri = () => Linking.createURL(PAYMENT_RETURN_PATH)

// Чем закончилось открытие страницы оплаты: returned — пользователь дошёл до
// конца (ЮKassa вернула его в приложение), closed — закрыл окно сам или
// свернул его и вернулся в приложение. В обоих случаях оплата могла пройти
// (закрыть окно можно и после оплаты), поэтому результат всегда
// перепроверяется у сервера, а не выводится отсюда.
export type CheckoutBrowserResult = 'returned' | 'closed'

// Страница оплаты ЮKassa открывается в системном окне поверх приложения;
// пользователь остаётся «в приложении» и по окончании оплаты возвращается в
// него сам.
export async function openCheckoutPage(confirmationUrl: string, returnUri: string): Promise<CheckoutBrowserResult> {
  const result = await WebBrowser.openAuthSessionAsync(confirmationUrl, returnUri)

  return result.type === 'success' ? 'returned' : 'closed'
}
