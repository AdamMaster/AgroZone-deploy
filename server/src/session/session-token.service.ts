import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request } from 'express'

import { isTokenTransportRequest, signSessionId } from './session-token'

@Injectable()
export class SessionTokenService {
  constructor(private readonly configService: ConfigService) {}

  // Ключ текущей сессии — только для приложения (запрос с
  // X-Auth-Transport: token, см. session-token.ts). Вызывать после того,
  // как сессия сохранена: до req.session.save() id сессии в Redis ещё нет.
  issueFor(req: Request): string | undefined {
    if (!isTokenTransportRequest(req) || !req.sessionID) return undefined

    return signSessionId(req.sessionID, this.configService.getOrThrow<string>('SESSION_SECRET'))
  }
}
