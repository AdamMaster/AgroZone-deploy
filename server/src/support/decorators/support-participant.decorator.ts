import { createParamDecorator, ExecutionContext } from '@nestjs/common'

import { SupportParticipant } from '../types/support-participant.type'

// Достаёт то, что SupportIdentityGuard положил в request.supportParticipant.
// Используется только на роутах за этим гвардом — если гварда не было,
// вернёт undefined (а не кинет), это осознанно: строгая проверка "гварда
// не было" не нужна нигде, кроме самого support-модуля, где гвард
// навешивается на весь контроллер сразу.
export const CurrentSupportParticipant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SupportParticipant => {
    const request = ctx.switchToHttp().getRequest()

    return request.supportParticipant
  }
)
