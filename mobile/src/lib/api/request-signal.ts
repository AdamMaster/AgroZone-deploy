// Мобильная сеть бывает очень медленной, но запрос, который висит дольше
// этого, пользователь уже воспринимает как зависание — лучше честно показать
// ошибку с кнопкой «Повторить».
export const REQUEST_TIMEOUT_MS = 15_000

// Связывает внешний сигнал отмены с внутренним таймаутом в один
// AbortController. AbortSignal.any/AbortSignal.timeout в Hermes есть не во
// всех версиях, поэтому собираем вручную. Возвращает функцию очистки —
// её обязательно вызвать, иначе таймер и подписка переживут запрос.
//
// Общий для запросов к нашему серверу (api-client) и к сторонним сервисам
// (подсказки адресов DaData).
export function createRequestSignal(external?: AbortSignal, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController()
  let timedOut = false

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  const onExternalAbort = () => controller.abort()

  if (external?.aborted) {
    controller.abort()
  } else {
    external?.addEventListener('abort', onExternalAbort)
  }

  return {
    signal: controller.signal,
    isTimedOut: () => timedOut,
    cleanup: () => {
      clearTimeout(timer)
      external?.removeEventListener('abort', onExternalAbort)
    }
  }
}
