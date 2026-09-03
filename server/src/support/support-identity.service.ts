import { ForbiddenException, Injectable } from '@nestjs/common'
import { Request } from 'express'
import { SessionData } from 'express-session'

import { UserService } from '@/user/user.service'

import { SupportGuestsService } from './support-guests.service'
import { SupportParticipant } from './types/support-participant.type'

// Разбор "кто пишет в поддержку" нужен в двух совершенно разных местах —
// SupportIdentityGuard (HTTP, каждый запрос) и SupportGateway (WS, один раз
// на хэндшейке сокета) — раньше это жило только в гварде; вынесено сюда,
// чтобы не дублировать (и не рассинхронизировать по мере правок) одну и ту
// же логику "юзер из сессии, иначе гость" в двух файлах.
@Injectable()
export class SupportIdentityService {
  constructor(
    private readonly userService: UserService,
    private readonly supportGuestsService: SupportGuestsService
  ) {}

  // HTTP-путь: тут можно и завести нового гостя, если его ещё не было —
  // request/response настоящие, express-session сам сохранит cookie в
  // ответ (см. SupportGuestsService.getOrCreateForSession). Ровно то, что
  // раньше было телом SupportIdentityGuard.canActivate.
  async resolveForRequest(request: Request): Promise<SupportParticipant> {
    const userId = request.session?.userId

    if (userId) {
      const user = await this.userService.findById(userId).catch(() => null)

      // Протухшая ссылка на удалённый аккаунт — не отказ, а просто
      // проваливаемся в гостевую ветку ниже (см. тот же комментарий раньше
      // в guard'е: human всё ещё стоит перед виджетом и хочет написать).
      if (user && !user.deletedAt) {
        return { type: 'user', user }
      }
    }

    const guest = await this.supportGuestsService.getOrCreateForSession(request)

    if (guest.blockedAt) {
      throw new ForbiddenException('Обращение в поддержку недоступно')
    }

    return { type: 'guest', guest }
  }

  // WS-путь: намеренно НЕ создаёт нового гостя — на хэндшейке сокета нет
  // настоящего HTTP-ответа, а значит express-session ничего не сохранит,
  // если тут же завести нового гостя и записать supportGuestId в сессию
  // (нет res.end, на который она обычно вешает автосохранение — см.
  // support.gateway.ts). Поэтому сокет просто читает то, что там уже
  // есть: к моменту его открытия виджет уже должен был сходить по REST
  // (GET /support/conversation), а тот путь и заводит гостя, и корректно
  // сохраняет cookie обычным HTTP-ответом. Нет ни userId, ни
  // supportGuestId в сессии — сокету нечего слушать, отдаём null.
  async resolveForHandshake(session: Partial<SessionData> | undefined): Promise<SupportParticipant | null> {
    const userId = session?.userId

    if (userId) {
      const user = await this.userService.findById(userId).catch(() => null)

      if (user && !user.deletedAt) {
        return { type: 'user', user }
      }
    }

    const guestId = session?.supportGuestId

    if (!guestId) {
      return null
    }

    const guest = await this.supportGuestsService.findExisting(guestId)

    if (!guest || guest.blockedAt) {
      return null
    }

    return { type: 'guest', guest }
  }
}
