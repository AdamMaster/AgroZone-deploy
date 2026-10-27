import { CanActivate, Injectable, NotFoundException } from '@nestjs/common'

import { SiteSettingsService } from '@/site-settings/site-settings.service'

// Пока рейтинги выключены в админке, ручки отзывов для клиента не
// существуют: 404, как у несуществующего адреса, а не «доступ запрещён» —
// снаружи не должно быть заметно, что функция вообще есть. Ставится первым
// в списке гардов, раньше проверки авторизации.
@Injectable()
export class SellerRatingsEnabledGuard implements CanActivate {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  async canActivate(): Promise<boolean> {
    const { sellerRatings } = await this.siteSettingsService.getFlags()

    if (!sellerRatings) {
      throw new NotFoundException()
    }

    return true
  }
}
