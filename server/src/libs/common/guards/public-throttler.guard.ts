import { Injectable } from '@nestjs/common'
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler'

// Лимит по IP для публичных «дорогих» эндпоинтов (геокодер Яндекса —
// платный, семантический поиск — CPU, сброс пароля — письма). Общий
// ThrottlerModule.forRoot даёт дефолт 3 запроса в минуту, на который
// рассчитаны другие гварды (например PhoneThrottlerGuard), поэтому
// конкретные лимиты задаются на роуте через @Throttle({ default: { limit, ttl } }),
// а сам гвард подключается точечно, а не глобально.
//
// Трекер по умолчанию — req.ip; при `trust proxy 1` (см. main.ts) это
// реальный адрес клиента из X-Forwarded-For от nginx.
@Injectable()
export class PublicThrottlerGuard extends ThrottlerGuard {
  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('Слишком много запросов. Подождите немного и попробуйте ещё раз')
  }
}
