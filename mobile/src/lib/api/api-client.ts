import { API_URL } from '@/config/env'

import { sessionTokenStorage } from '@/lib/auth/session-token-storage'

import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  TIMEOUT_ERROR_MESSAGE,
  extractServerMessage,
  getStatusErrorMessage
} from './api-error'

export type QueryParamValue = string | number | boolean | null | undefined

export type QueryParams = Record<string, QueryParamValue | readonly QueryParamValue[]>

type HttpMethod = 'GET' | 'POST'

interface RequestOptions {
  params?: QueryParams
  body?: unknown
  headers?: Record<string, string>
  // Сигнал отмены от вызывающего кода — react-query передаёт его в queryFn и
  // отменяет запрос, когда экран закрыли или ключ запроса сменился.
  signal?: AbortSignal
  // false — ручка ничего не возвращает (например, выход): пустой ответ
  // тогда не ошибка формата.
  expectBody?: boolean
}

// Мобильная сеть бывает очень медленной, но запрос, который висит дольше
// этого, пользователь уже воспринимает как зависание — лучше честно показать
// ошибку с кнопкой «Повторить».
const REQUEST_TIMEOUT_MS = 15_000

// Просит сервер отдавать ключ сессии в теле ответа на вход (см.
// server/src/session/session-token.ts) — у приложения нет cookie.
const AUTH_TRANSPORT_HEADERS = { 'X-Auth-Transport': 'token' } as const

// Сессия закончилась на сервере (истекла, завершена с другого устройства,
// аккаунт удалён) — сервер ответил 401 на запрос с ключом. Обработчик
// регистрирует слой авторизации (features/auth), чтобы HTTP-клиент не
// зависел от него напрямую.
let onSessionRejected: (() => void) | null = null

export function setSessionRejectedHandler(handler: (() => void) | null) {
  onSessionRejected = handler
}

// null/undefined/пустые строки не отправляем вовсе — сервер трактует
// отсутствующий параметр как «фильтр не задан», а пустую строку может
// счесть невалидным значением.
export function buildQueryString(params: QueryParams): string {
  const search = new URLSearchParams()

  for (const [key, raw] of Object.entries(params)) {
    const values = Array.isArray(raw) ? raw : [raw]

    for (const value of values) {
      if (value === null || value === undefined || value === '') continue
      search.append(key, String(value))
    }
  }

  const query = search.toString()
  return query ? `?${query}` : ''
}

// Связывает внешний сигнал отмены с внутренним таймаутом в один
// AbortController. AbortSignal.any/AbortSignal.timeout в Hermes есть не во
// всех версиях, поэтому собираем вручную. Возвращает функцию очистки —
// её обязательно вызвать, иначе таймер и подписка переживут запрос.
function createRequestSignal(external?: AbortSignal) {
  const controller = new AbortController()
  let timedOut = false

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

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

async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
  const { params, body: requestBody, headers, signal, expectBody = true } = options
  const url = `${API_URL}${path}${params ? buildQueryString(params) : ''}`
  const requestSignal = createRequestSignal(signal)
  const sessionToken = sessionTokenStorage.get()

  let response: Response
  let body: unknown

  // Таймаут покрывает и ожидание заголовков, и чтение тела: на плохой сети
  // тело большой выдачи может грузиться дольше, чем пришли заголовки.
  try {
    response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...AUTH_TRANSPORT_HEADERS,
        ...(sessionToken && { Authorization: `Bearer ${sessionToken}` }),
        ...(requestBody !== undefined && { 'Content-Type': 'application/json' }),
        ...headers
      },
      body: requestBody !== undefined ? JSON.stringify(requestBody) : undefined,
      signal: requestSignal.signal
    })

    const isJson = response.headers.get('Content-Type')?.includes('application/json') ?? false

    // Тело может оказаться HTML-страницей ошибки nginx или битым JSON —
    // падать на разборе нельзя, иначе потеряется настоящий статус ответа.
    body = isJson ? await response.json().catch(() => undefined) : undefined

    // Отмена во время чтения тела гасится .catch выше — не выдаём её за
    // «неожиданный формат ответа», а уходим в общую обработку отмены ниже.
    if (requestSignal.signal.aborted) throw new Error('Request aborted')
  } catch (error) {
    // Отмену самим вызывающим кодом (ушли с экрана) пробрасываем как есть —
    // react-query распознаёт её и не считает ошибкой запроса.
    if (signal?.aborted) throw error

    throw new ApiError(0, requestSignal.isTimedOut() ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE)
  } finally {
    requestSignal.cleanup()
  }

  if (!response.ok) {
    // 401 на запрос С ключом — сессия больше недействительна. 401 без ключа
    // (например, неверный пароль при входе) к сессии отношения не имеет.
    // Сверяем с текущим ключом: если пользователь уже вошёл заново, ответ
    // на старый запрос не должен выкинуть его из новой сессии.
    if (response.status === 401 && sessionToken && sessionToken === sessionTokenStorage.get()) {
      onSessionRejected?.()
    }

    throw new ApiError(response.status, extractServerMessage(body) ?? getStatusErrorMessage(response.status))
  }

  if (body === undefined && expectBody) {
    throw new ApiError(response.status, 'Сервер вернул ответ в неожиданном формате')
  }

  return body as T
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'body'>) => request<T>('GET', path, options),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) =>
    request<T>('POST', path, { ...options, body: body ?? {} })
}
