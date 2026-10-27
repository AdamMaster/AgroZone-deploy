import { Module } from '@nestjs/common'

import { AuthModule } from '@/auth/auth.module'
import { RedisModule } from '@/redis/redis.module'
import { UserModule } from '@/user/user.module'

import { SiteSettingsAdminController } from './site-settings-admin.controller'
import { SiteSettingsController } from './site-settings.controller'
import { SiteSettingsService } from './site-settings.service'

// UserModule и AuthModule нужны гвардам админского контроллера (как в
// AdminDashboardModule); PrismaService приходит из глобального PrismaModule.
// Сервис экспортируется: проверять флаги будут и другие модули (например,
// отзывы о продавцах).
@Module({
  imports: [UserModule, AuthModule, RedisModule],
  controllers: [SiteSettingsController, SiteSettingsAdminController],
  providers: [SiteSettingsService],
  exports: [SiteSettingsService]
})
export class SiteSettingsModule {}
