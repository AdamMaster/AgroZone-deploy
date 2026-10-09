import { BadRequestException, Injectable } from '@nestjs/common'
import { createHash, randomBytes, timingSafeEqual } from 'crypto'

import { RedisService } from '@/redis/redis.service'

// Вход через соцсеть (Яндекс) из мобильного приложения.
//
// На сайте всё держится на cookie: state кладётся в сессию браузера, а после
// колбэка сессия открывается в нём же. У приложения так не выйдет — страница
// провайдера открывается в системном браузере, а сессия нужна в самом
// приложении. Поэтому:
//  1. приложение придумывает одноразовый секрет (code verifier) и при
//     запросе ссылки на провайдера присылает только его отпечаток
//     (SHA-256, code challenge) и адрес возврата в приложение;
//  2. state и эти данные лежат в Redis (не в сессии — её у браузера нет);
//  3. после колбэка провайдера сервер не открывает сессию в браузере, а
//     перенаправляет в приложение с одноразовым кодом (ticket) на 60 секунд;
//  4. приложение меняет ticket на ключ сессии, предъявив исходный секрет.
// Ключ сессии никогда не попадает в адресную строку, а перехваченный ticket
// без секрета бесполезен (та же схема, что PKCE в OAuth для приложений).

const STATE_TTL_SECONDS = 10 * 60
const TICKET_TTL_SECONDS = 60

const STATE_KEY_PREFIX = 'auth:mobile-oauth:state:'
const TICKET_KEY_PREFIX = 'auth:mobile-oauth:ticket:'

// Куда разрешено возвращать пользователя после входа: схема собранного
// приложения (app.json → scheme) и схемы Expo Go для разработки. Любой
// другой адрес — отказ: иначе ручка стала бы открытым редиректом.
// Перехватить возврат на эти схемы может и чужое приложение, но без code
// verifier полученный ticket ему ничего не даст.
const ALLOWED_REDIRECT_PROTOCOLS = new Set(['agrozone:', 'exp:', 'exps:'])
const MAX_REDIRECT_URI_LENGTH = 512

// RFC 7636: challenge = base64url(SHA-256(verifier)) без '=' — ровно 43 символа.
const CODE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/

interface PendingAuthRequest {
  redirectUri: string
  codeChallenge: string
}

interface IssuedTicket {
  userId: string
  isNewUser: boolean
  codeChallenge: string
}

export const INVALID_TICKET_MESSAGE = 'Код входа недействителен или устарел. Попробуйте войти ещё раз.'

export function isAllowedMobileRedirectUri(redirectUri: string): boolean {
  if (redirectUri.length > MAX_REDIRECT_URI_LENGTH) return false

  try {
    return ALLOWED_REDIRECT_PROTOCOLS.has(new URL(redirectUri).protocol)
  } catch {
    return false
  }
}

export function createCodeChallenge(codeVerifier: string): string {
  return createHash('sha256').update(codeVerifier).digest('base64url')
}

// Добавляет параметры к адресу возврата в приложение. URL/URLSearchParams
// для нестандартных схем вроде exp://192.168.1.5:8081/--/oauth ведут себя
// непредсказуемо, поэтому параметры просто дописываем строкой.
export function appendQuery(uri: string, params: Record<string, string>): string {
  const query = new URLSearchParams(params).toString()

  return `${uri}${uri.includes('?') ? '&' : '?'}${query}`
}

@Injectable()
export class MobileOAuthService {
  constructor(private readonly redis: RedisService) {}

  async createAuthRequest(redirectUri: string, codeChallenge: string): Promise<string> {
    if (!isAllowedMobileRedirectUri(redirectUri)) {
      throw new BadRequestException('Недопустимый адрес возврата в приложение.')
    }

    if (!CODE_CHALLENGE_PATTERN.test(codeChallenge)) {
      throw new BadRequestException('Некорректный параметр codeChallenge.')
    }

    const state = randomBytes(24).toString('hex')
    const payload: PendingAuthRequest = { redirectUri, codeChallenge }

    await this.redis.set(`${STATE_KEY_PREFIX}${state}`, payload, STATE_TTL_SECONDS)

    return state
  }

  // Колбэк провайдера: state одноразовый (GETDEL), повторный заход по той же
  // ссылке не пройдёт. null — это не запрос приложения (а сайта или
  // устаревший), колбэк обрабатывается обычным образом.
  async consumeAuthRequest(state: string | undefined): Promise<PendingAuthRequest | null> {
    if (!state) return null

    return this.takeJson<PendingAuthRequest>(`${STATE_KEY_PREFIX}${state}`)
  }

  async issueTicket(payload: IssuedTicket): Promise<string> {
    const ticket = randomBytes(32).toString('hex')

    await this.redis.set(`${TICKET_KEY_PREFIX}${ticket}`, payload, TICKET_TTL_SECONDS)

    return ticket
  }

  // Обмен ticket → пользователь. Ticket удаляется при первой же попытке, даже
  // неудачной: подбирать verifier к перехваченному ticket бессмысленно.
  async redeemTicket(ticket: string, codeVerifier: string): Promise<{ userId: string; isNewUser: boolean }> {
    const issued = await this.takeJson<IssuedTicket>(`${TICKET_KEY_PREFIX}${ticket}`)

    if (!issued) {
      throw new BadRequestException(INVALID_TICKET_MESSAGE)
    }

    const expected = Buffer.from(issued.codeChallenge)
    const actual = Buffer.from(createCodeChallenge(codeVerifier))

    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new BadRequestException(INVALID_TICKET_MESSAGE)
    }

    return { userId: issued.userId, isNewUser: issued.isNewUser }
  }

  private async takeJson<T>(key: string): Promise<T | null> {
    const raw = await this.redis.getClient().getDel(key)

    if (!raw) return null

    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  }
}
