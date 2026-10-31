import { Injectable } from '@nestjs/common'
import { ThrottlerException } from '@nestjs/throttler'

import { UserThrottlerGuard } from '@/libs/common/guards/user-throttler.guard'

// Рейт-лимит на раскрытие телефона продавца (см. B2 в ROADMAP.md,
// AdsController.getPhone). Без него достаточно было бы одного
// авторизованного аккаунта, чтобы перебором id выкачать номера всех
// продавцов на сайте. Лимит на аккаунт (см. UserThrottlerGuard): завести много
// аккаунтов ради обхода — ощутимо более дорогая для атакующего преграда.
@Injectable()
export class AdPhoneThrottlerGuard extends UserThrottlerGuard {
  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('Слишком много запросов номера телефона. Подождите минуту и попробуйте снова')
  }
}
