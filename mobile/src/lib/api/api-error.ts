// Ошибка запроса к API. statusCode 0 — запрос вообще не дошёл до сервера
// (нет сети, таймаут, обрыв соединения), так же, как FetchError на сайте
// (client/src/shared/fetch/fetch-error.ts) — поведение и тексты совпадают,
// чтобы пользователь видел одинаковые сообщения в приложении и на сайте.
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }

  // Ошибки, при которых повторить тот же запрос имеет смысл: сеть, таймаут,
  // перегрузка/перезапуск сервера. 4xx (кроме 408 и 429) повторять
  // бесполезно — ответ не изменится.
  get isRetryable(): boolean {
    return this.statusCode === 0 || this.statusCode === 408 || this.statusCode === 429 || this.statusCode >= 500
  }
}

export const NETWORK_ERROR_MESSAGE = 'Не удалось связаться с сервером. Проверьте интернет и попробуйте ещё раз'
export const TIMEOUT_ERROR_MESSAGE = 'Превышено время ожидания. Проверьте интернет и попробуйте ещё раз'

const STATUS_ERROR_MESSAGES: Partial<Record<number, string>> = {
  408: TIMEOUT_ERROR_MESSAGE,
  413: 'Слишком большой объём данных. Уменьшите количество или размер файлов и попробуйте снова',
  429: 'Слишком много запросов. Подождите немного и попробуйте снова',
  502: 'Сервер временно недоступен. Попробуйте через минуту',
  503: 'Сервер временно недоступен. Попробуйте через минуту',
  504: 'Сервер не успел ответить. Попробуйте ещё раз'
}

export const getStatusErrorMessage = (status: number): string =>
  STATUS_ERROR_MESSAGES[status] ?? 'Ошибка со стороны сервера'

// NestJS отдаёт message либо строкой, либо массивом строк (ошибки
// class-validator по каждому полю DTO).
export const extractServerMessage = (body: unknown): string | undefined => {
  if (typeof body !== 'object' || body === null || !('message' in body)) return undefined

  const { message } = body as { message: unknown }

  if (typeof message === 'string' && message.trim()) return message
  if (Array.isArray(message)) {
    const parts = message.filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    return parts.length > 0 ? parts.join('. ') : undefined
  }

  return undefined
}
