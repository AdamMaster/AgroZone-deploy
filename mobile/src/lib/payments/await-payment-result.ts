// Значения — как у статусов платежа на сервере (PremiumPurchaseStatus,
// AdServicePurchaseStatus).
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'CANCELED'

interface AwaitPaymentResultOptions {
  // Сколько раз спросить сервер, если платёж ещё не завершён.
  attempts?: number
  intervalMs?: number
}

// Сервер узнаёт об оплате от ЮKassa (вебхук) с задержкой в секунды, а
// пользователь возвращается в приложение мгновенно. Поэтому один вопрос
// «оплачено?» сразу после возврата часто застаёт платёж ещё в обработке:
// переспрашиваем несколько раз. Каждая проверка заодно просит сервер
// перепроверить платёж напрямую у ЮKassa, так что услуга применится, даже
// если вебхук не дошёл.
const DEFAULT_ATTEMPTS = 6
const DEFAULT_INTERVAL_MS = 2000

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

// Ждёт окончательного статуса платежа. PENDING на выходе значит «пока
// неизвестно»: платёж ещё обрабатывается, не оплачен или не удалось
// проверить. Сбой одной проверки (пропала сеть на секунду) не прерывает
// ожидание: следующая попытка может пройти.
export async function awaitPaymentResult(
  check: () => Promise<PaymentStatus>,
  { attempts = DEFAULT_ATTEMPTS, intervalMs = DEFAULT_INTERVAL_MS }: AwaitPaymentResultOptions = {}
): Promise<PaymentStatus> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) await delay(intervalMs)

    try {
      const status = await check()

      if (status !== 'PENDING') return status
    } catch {
      // Попробуем ещё раз на следующем круге.
    }
  }

  return 'PENDING'
}
