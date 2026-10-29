import { Platform } from 'react-native'

import { API_URL } from '@/config/env'

import { sessionTokenStorage } from '@/lib/auth/session-token-storage'

import {
  ApiError,
  NETWORK_ERROR_MESSAGE,
  TIMEOUT_ERROR_MESSAGE,
  extractServerMessage,
  getStatusErrorMessage
} from './api-error'
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

// Пока телефон лежал, мобильная сеть и Wi-Fi забывают о соединении с
// сервером, а приложение этого не знает: первый запрос после паузы уходит в
// «мёртвое» соединение и теряется (сообщение «не отправляется», пока
// приложение не перезапустят). Поэтому перед запросом, который что-то меняет
// (отправка сообщения, сохранение), после паузы в обмене с сервером отправляем
// лёгкий запрос с коротким пределом: он «пробивает» мёртвое соединение, и сам
// запрос уже идёт по живому. Повторять сам запрос нельзя — он мог дойти до
// сервера, и получился бы дубль.
const STALE_CONNECTION_MS = 20_000
const PROBE_TIMEOUT_MS = 3_000

let lastServerContactAt = Date.now()
let probeInFlight: Promise<void> | null = null

async function ensureLiveConnection(): Promise<void> {
  if (Platform.OS === 'web' || Date.now() - lastServerContactAt < STALE_CONNECTION_MS) return

  probeInFlight ??= (async () => {
    const probeSignal = createRequestSignal(undefined, PROBE_TIMEOUT_MS)

    try {
      await fetch(`${API_URL}/site-settings/public`, { signal: probeSignal.signal })
    } catch {
      // Результат не важен: проба нужна, чтобы сбросить мёртвое соединение.
    } finally {
      probeSignal.cleanup()
      lastServerContactAt = Date.now()
      probeInFlight = null
    }
  })()

  await probeInFlight
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
  if (method !== 'GET') await ensureLiveConnection()

  const requestSignal = createRequestSignal(signal, timeoutMs)
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
        ...(requestBody !== undefined && !isMultipart && { 'Content-Type': 'application/json' }),
        ...headers
      },
      body: isMultipart ? requestBody : requestBody !== undefined ? JSON.stringify(requestBody) : undefined,
      signal: requestSignal.signal
    })

    lastServerContactAt = Date.now()

    const isJson = response.headers.get('Content-Type')?.includes('application/json') ?? false

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
    // «неожиданный формат ответа», а уходим в общую обработку отмены ниже.
    if (requestSignal.signal.aborted) throw new Error('Request aborted')
  } catch (error) {
    // Отмену самим вызывающим кодом (ушли с экрана) пробрасываем как есть —
    // react-query распознаёт её и не считает ошибкой запроса.
    if (signal?.aborted) throw error

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
