import { ServiceUnavailableException } from '@nestjs/common'

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3'

// Сколько ждём ответа ЮKassa. Без предела зависший ответ держал бы запрос
// пользователя (кнопка «Оплатить» крутилась бы бесконечно) и обработку
// вебхука, а накопившиеся такие запросы занимали бы соединения сервера.
const YOOKASSA_REQUEST_TIMEOUT_MS = 15_000

// Запрос к API ЮKassa с пределом ожидания. Недоступность ЮKassa (таймаут,
// обрыв сети) превращается в понятный 503: на вебхук ЮKassa ответит
// повторной доставкой позже, а пользователь увидит просьбу повторить.
// Ответ с ошибкой (не 2xx) возвращается как есть: его разбирает вызывающий код.
export async function yookassaFetch(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${YOOKASSA_API_URL}${path}`, {
      ...init,
      signal: AbortSignal.timeout(YOOKASSA_REQUEST_TIMEOUT_MS)
    })
  } catch (error) {
    throw new ServiceUnavailableException('ЮKassa сейчас не отвечает. Попробуйте ещё раз чуть позже', { cause: error })
  }
}
