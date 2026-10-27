import { Controller, Get } from '@nestjs/common'

import { SiteSettingsService } from './site-settings.service'
import type { SiteFlags } from './site-settings.types'

@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  // Публичная ручка без авторизации: сайт (SSR) и приложение читают её до
  // входа, чтобы решить, показывать ли функцию. Отдаёт только значения
  // флагов — см. предупреждение в site-flags.constants.ts.
  @Get('public')
  getPublicFlags(): Promise<SiteFlags> {
    return this.siteSettingsService.getFlags()
  }
}
