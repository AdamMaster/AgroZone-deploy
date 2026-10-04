import { AsyncLocalStorage } from 'node:async_hooks'
import type { NextFunction, Request, Response } from 'express'

import { UserRole } from '@/generated/prisma/enums'
import { getClientIp } from '@/libs/common/utils/request-ip.util'

// Контекст текущего HTTP-запроса для журнала безопасности.
//
// Зачем AsyncLocalStorage, а не прокидывание Request/ip/userAgent в каждый
// метод сервисов: событие безопасности пишется в глубине бизнес-логики
// (UserService.updatePassword, EmailChangeService.confirmEmailChange, …),
// куда Request сам не доходит, и протягивать его через 15+ сигнатур —
// значит и засорить их, и гарантированно где-нибудь забыть. Контекст же
// подхватывается автоматически в SecurityEventsService.record(): IP,
// User-Agent и "кто сейчас действует" берутся из запроса, в рамках которого
// выполняется код (AsyncLocalStorage переживает await/промисы). Это тот же
// приём, что у nestjs-cls, только без лишней зависимости.
//
// В контексте хранится сам Request, а не снимок его полей: AuthGuard
// проставляет req.user уже ПОСЛЕ того, как middleware отработал, и снимок
// на входе его бы не увидел.
const storage = new AsyncLocalStorage<Request>()

export function requestContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  storage.run(req, next)
}

export interface RequestMeta {
  ip: string | null
  userAgent: string | null
  // Кто выполняет запрос (владелец сессии) — может не совпадать с
  // пользователем, над которым совершается действие (админ меняет чужой
  // пароль). null — запрос анонимный (вход, сброс пароля по ссылке).
  actingUserId: string | null
  actingUserRole: UserRole | null
}

// IPv4, завёрнутый в IPv6 ("::ffff:203.0.113.7"), приводим к обычному виду —
// иначе один и тот же клиент в журнале выглядел бы двумя разными адресами.
function normalizeIp(ip: string): string | null {
  if (!ip || ip === 'unknown') {
    return null
  }

  return ip.startsWith('::ffff:') ? ip.slice('::ffff:'.length) : ip
}

// null — код выполняется вне HTTP-запроса (cron-воркер, скрипт, юнит-тест).
export function getRequestMeta(): RequestMeta | null {
  const req = storage.getStore()

  if (!req) {
    return null
  }

  const userAgent = req.headers['user-agent']

  return {
    ip: normalizeIp(getClientIp(req)),
    userAgent: typeof userAgent === 'string' ? userAgent : null,
    actingUserId: req.user?.id ?? req.session?.userId ?? null,
    actingUserRole: req.user?.role ?? req.session?.userRole ?? null
  }
}
