import { Injectable } from '@nestjs/common'
import { ThrottlerException, ThrottlerGuard } from '@nestjs/throttler'

// Рейт-лимит на раскрытие телефона продавца (см. B2 в ROADMAP.md,
// AdsController.getPhone). Без него достаточно было бы одного
// авторизованного аккаунта, чтобы перебором id выкачать номера всех
// продавцов на сайте.
//
// Трекаем не по IP (это поведение ThrottlerGuard по умолчанию), а по
// userId — эндпоинт уже спрятан за AuthGuard, и request.user на момент
// проверки гарантированно заполнен (порядок важен: AuthGuard должен идти
// первым в @UseGuards). Лимит на аккаунт, а не на сеть — смена IP/прокси
// не даёт обхода, пока используется тот же аккаунт, а завести много
// аккаунтов ради обхода — уже отдельная, ощутимо более дорогая для
// атакующего преграда.
@Injectable()
export class AdPhoneThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId: string | undefined = req.user?.id
    return userId ? `user:${userId}` : (req.ip as string)
  }

  protected async throwThrottlingException(): Promise<void> {
    throw new ThrottlerException('Слишком много запросов номера телефона. Подождите минуту и попробуйте снова')
  }
}
