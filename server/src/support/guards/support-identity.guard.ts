import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Request } from 'express'

import { SupportIdentityService } from '../support-identity.service'

// В отличие от AuthGuard — никогда не 401-ит. Чат поддержки публичный по
// определению (см. обсуждение с пользователем: залогиненность не должна
// быть условием, чтобы написать в поддержку), задача гварда — не пустить
// или не пустить, а определить УЧАСТНИКА: залогиненного юзера, если сессия
// валидна, иначе — гостя (существующего по supportGuestId в сессии, либо
// только что созданного). Вся сама логика разбора — в SupportIdentityService
// (её же переиспользует SupportGateway для сокетов, см. support.gateway.ts);
// гвард — тонкая обвязка под HTTP-контекст. Единственный случай реального
// отказа — заблокированный гость, ForbiddenException прилетает из сервиса.
@Injectable()
export class SupportIdentityGuard implements CanActivate {
  constructor(private readonly identityService: SupportIdentityService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()

    request.supportParticipant = await this.identityService.resolveForRequest(request)

    return true
  }
}
