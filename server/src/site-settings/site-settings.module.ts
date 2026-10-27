import { Global, Module } from '@nestjs/common'

import { AuthModule } from '@/auth/auth.module'
import { RedisModule } from '@/redis/redis.module'
import { UserModule } from '@/user/user.module'

import { SiteSettingsAdminController } from './site-settings-admin.controller'
import { SiteSettingsController } from './site-settings.controller'
import { SiteSettingsService } from './site-settings.service'

// UserModule и AuthModule нужны гвардам админского контроллера (как в
// AdminDashboardModule); PrismaService приходит из глобального PrismaModule.
// Модуль глобальный (как SecurityEventsModule): флаги читают UserService,
// AdsService и гард отзывов, а UserModule сам импортируется здесь — явный
// импорт этого модуля в UserModule был бы циклом.
@Global()
@Module({
  imports: [UserModule, AuthModule, RedisModule],
  controllers: [SiteSettingsController, SiteSettingsAdminController],
  providers: [SiteSettingsService],
  exports: [SiteSettingsService]
})
export class SiteSettingsModule {}
