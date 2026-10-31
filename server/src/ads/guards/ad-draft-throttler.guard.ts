import { Injectable } from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'

import { UserThrottlerGuard } from '@/libs/common/guards/user-throttler.guard'

// Сохранение черновика принимает до 15 фото и обрабатывает их (сжатие, S3), а
// значит самый дорогой запрос формы: без лимита аккаунт мог бы в цикле
// забить хранилище и процессор (M6 в audit-2026-10-05.md).
@Injectable()
export class AdDraftThrottlerGuard extends UserThrottlerGuard {
  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('Слишком много сохранений черновика. Подождите минуту и попробуйте снова')
  }
}
