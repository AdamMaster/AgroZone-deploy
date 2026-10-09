import { createHmac } from 'crypto'
import { Request, RequestHandler } from 'express'

// Ключ сессии для мобильного приложения.
//
// Сайт хранит сессию в cookie (express-session + Redis, см. main.ts). У
// нативного приложения нет браузерных cookie, поэтому оно получает тот же
// самый ключ сессии в теле ответа на вход и дальше присылает его в
// заголовке `Authorization: Bearer <ключ>`. Ключ — ровно то значение,
// которое express-session положил бы в cookie: `s:<id сессии>.<подпись>`.
// Подделать его без SESSION_SECRET нельзя — подпись проверяет сам
// express-session, как и для cookie.
//
// Благодаря этому у приложения нет «своей» авторизации: те же сессии в
// Redis, те же гарды (req.session.userId), тот же выход и удаление аккаунта,
// тот же журнал безопасности — ничего из этого не пришлось дублировать.

// Заголовок, которым приложение просит отдать ключ сессии в теле ответа.
// Сайт его не отправляет и ключа никогда не получает — его cookie остаётся
// httpOnly, недоступной для JavaScript страницы.
export const AUTH_TRANSPORT_HEADER = 'x-auth-transport'
export const AUTH_TRANSPORT_TOKEN = 'token'

const BEARER_PREFIX = 'Bearer '

// id сессии express-session (uid-safe, base64url) и HMAC-подпись в base64
// без «=». Строгая проверка формата — не только защита от мусора: значение
// дальше подставляется в заголовок Cookie, и символы вроде «;» или «,»
// позволили бы дописать туда произвольные cookie.
const SESSION_TOKEN_PATTERN = /^s:[A-Za-z0-9_-]{16,128}\.[A-Za-z0-9+/]{16,128}$/

// Та же подпись, что делает express-session (пакет cookie-signature):
// значение + '.' + base64(HMAC-SHA256) без завершающих '='. Совместимость
// с самим express-session проверяется в session-token.spec.ts.
export function signSessionId(sessionId: string, secret: string): string {
  const signature = createHmac('sha256', secret).update(sessionId).digest('base64').replace(/=+$/, '')

  return `s:${sessionId}.${signature}`
}

export function isTokenTransportRequest(req: Request): boolean {
  return req.headers[AUTH_TRANSPORT_HEADER] === AUTH_TRANSPORT_TOKEN
}

export function extractBearerSessionToken(authorization: string | undefined): string | null {
  if (!authorization?.startsWith(BEARER_PREFIX)) return null

  const token = authorization.slice(BEARER_PREFIX.length).trim()

  return SESSION_TOKEN_PATTERN.test(token) ? token : null
}

function hasCookie(cookieHeader: string | undefined, name: string): boolean {
  if (!cookieHeader) return false

  return cookieHeader.split(';').some(part => part.trim().startsWith(`${name}=`))
}

// Подставляет ключ из Authorization в заголовок Cookie под именем cookie
// сессии — дальше express-session находит и проверяет сессию обычным
// путём. Должен стоять ДО express-session (и cookie-parser).
//
// Если у запроса уже есть cookie сессии (это сайт), заголовок Authorization
// игнорируется: у одного запроса не может быть двух сессий, а браузерная
// всегда главнее. Невалидный ключ тоже просто игнорируется — запрос пойдёт
// как анонимный, и защищённые ручки ответят 401, как без входа.
export function createSessionTokenMiddleware(sessionName: string): RequestHandler {
  return (req, _res, next) => {
    const token = extractBearerSessionToken(req.headers.authorization)

    if (token && !hasCookie(req.headers.cookie, sessionName)) {
      const sessionCookie = `${sessionName}=${encodeURIComponent(token)}`
      req.headers.cookie = req.headers.cookie ? `${req.headers.cookie}; ${sessionCookie}` : sessionCookie
    }

    next()
  }
}
