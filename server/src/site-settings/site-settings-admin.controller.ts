import { Body, Controller, Get, Param, ParseEnumPipe, Patch } from '@nestjs/common'
import { UserRole } from '@/generated/prisma/enums'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { Authorized } from '@/auth/decorators/authorized.decorator'

import { SiteFlagKey } from './constants/site-flags.constants'
import { UpdateSiteSettingDto } from './dto/update-site-setting.dto'
import { SiteSettingsService } from './site-settings.service'
import type { AdminSiteFlag, AdminSiteSettings } from './site-settings.types'

@Controller('admin/site-settings')
@Authorization(UserRole.ADMIN)
export class SiteSettingsAdminController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Get()
  getSettings(): Promise<AdminSiteSettings> {
    return this.siteSettingsService.getAdminSettings()
  }

  // Неизвестный ключ ParseEnumPipe отсекает с 400 ещё до сервиса.
  @Patch(':key')
  update(
    @Param('key', new ParseEnumPipe(SiteFlagKey)) key: SiteFlagKey,
    @Body() dto: UpdateSiteSettingDto,
    @Authorized('id') adminId: string
  ): Promise<AdminSiteFlag> {
    return this.siteSettingsService.update(key, dto.value, adminId)
  }
}
