import { API_URL } from '@/config/env'

import { sessionTokenStorage } from '@/lib/auth/session-token-storage'

import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  TIMEOUT_ERROR_MESSAGE,
  extractServerMessage,
  getStatusErrorMessage
} from './api-error'
import { resetConnections } from './connection-reset'
import { createRequestSignal } from './request-signal'

type QueryParamValue = string | number | boolean | null | undefined

type QueryParams = Record<string, QueryParamValue | readonly QueryParamValue[]>

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

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
  // 'text' — ручка отдаёт голую строку, а не JSON (например, адрес по
  // координатам, GET /ads/geocode: Nest отправляет строку как text/html).
  responseType?: 'json' | 'text'
  // Свой предел ожидания — для загрузки файлов: документ в 15 МБ по
  // мобильной сети дольше обычных 15 секунд.
  timeoutMs?: number
}

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

// Отмена по сигналу должна завершать запрос всегда. Обычно fetch сам
// отвечает на abort ошибкой, но если соединение мёртвое, он может не отозваться
// вовсе, и экран будет вечно показывать загрузку. Поэтому ждём не только
// запрос, но и сам сигнал.
function rejectOnAbort<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new Error('Request aborted'))

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Error('Request aborted'))

    signal.addEventListener('abort', onAbort, { once: true })
    work.then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort))
  })
}

// Отправляет запрос и читает тело ответа. Таймаут (через signal) покрывает и
// ожидание заголовков, и чтение тела: на плохой сети тело большой выдачи
// может грузиться дольше, чем пришли заголовки.
async function exchange(
  url: string,
  init: RequestInit,
  responseType: 'json' | 'text'
): Promise<{ response: Response; body: unknown }> {
  const response = await fetch(url, init)
  const isJson = response.headers.get('Content-Type')?.includes('application/json') ?? false
  let body: unknown

  // Тело может оказаться HTML-страницей ошибки nginx или битым JSON —
  // падать на разборе нельзя, иначе потеряется настоящий статус ответа.
  // Ошибки сервер отдаёт JSON-ом всегда, поэтому текст читаем только из
  // успешного ответа.
  if (isJson) {
    body = await response.json().catch(() => undefined)
  } else if (responseType === 'text' && response.ok) {
    body = await response.text().catch(() => undefined)
  }

  // Отмена во время чтения тела гасится .catch выше — не выдаём её за
  // «неожиданный формат ответа», а уходим в общую обработку отмены.
  if (init.signal?.aborted) throw new Error('Request aborted')

  return { response, body }
}

// null/undefined/пустые строки не отправляем вовсе — сервер трактует
// отсутствующий параметр как «фильтр не задан», а пустую строку может
// счесть невалидным значением.
function buildQueryString(params: QueryParams): string {
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

async function request<T>(method: HttpMethod, path: string, options: RequestOptions = {}): Promise<T> {
  const { params, body: requestBody, headers, signal, expectBody = true, responseType = 'json', timeoutMs } = options
  // Файлы (фото профиля, документ) уходят multipart/form-data: заголовок с
  // границей частей fetch ставит сам, задавать его вручную нельзя.
  const isMultipart = requestBody instanceof FormData
  const url = `${API_URL}${path}${params ? buildQueryString(params) : ''}`

  const requestSignal = createRequestSignal(signal, timeoutMs)
  const sessionToken = sessionTokenStorage.get()

  let response: Response
  let body: unknown

  try {
    ;({ response, body } = await rejectOnAbort(
      exchange(
        url,
        {
          method,
          headers: {
            Accept: 'application/json',
            ...AUTH_TRANSPORT_HEADERS,
            ...(sessionToken && { Authorization: `Bearer ${sessionToken}` }),
            ...(requestBody !== undefined && !isMultipart && { 'Content-Type': 'application/json' }),
            ...headers
          },
          body: isMultipart ? requestBody : requestBody !== undefined ? JSON.stringify(requestBody) : undefined,
          signal: requestSignal.signal
        },
        responseType
      ),
      requestSignal.signal
    ))
  } catch (error) {
    // Отмену самим вызывающим кодом (ушли с экрана) пробрасываем как есть —
    // react-query распознаёт её и не считает ошибкой запроса.
    if (signal?.aborted) throw error

    // Сеть не ответила: соединение из пула могло оказаться «мёртвым». Закрываем
    // его, чтобы повтор запроса (react-query или кнопка «Повторить») не ушёл
    // туда же.
    resetConnections()

    // ВРЕМЕННО (диагностика загрузки фото, 29.10.2026): у запросов с файлами к
    // тексту ошибки добавляется причина от телефона, чтобы понять, почему
    // запрос не уходит. Убрать после починки.
    const baseMessage = requestSignal.isTimedOut() ? TIMEOUT_ERROR_MESSAGE : NETWORK_ERROR_MESSAGE
    const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error)

    throw new ApiError(0, isMultipart ? `${baseMessage} [${reason}]` : baseMessage)
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
    request<T>('POST', path, { ...options, body: body ?? {} }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) =>
    request<T>('PUT', path, { ...options, body: body ?? {} }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'body'>) =>
    request<T>('PATCH', path, { ...options, body: body ?? {} }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'body'>) => request<T>('DELETE', path, options)
}
