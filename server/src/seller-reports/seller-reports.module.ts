import { Module } from '@nestjs/common'

import { AdsModule } from '@/ads/ads.module'
import { AuthModule } from '@/auth/auth.module'
import { NotificationsModule } from '@/notifications/notifications.module'
import { SellerReviewsModule } from '@/seller-reviews/seller-reviews.module'
import { UserModule } from '@/user/user.module'

import { SellerAdsSuspensionService } from './seller-ads-suspension.service'
import { SellerReportsAdminController } from './seller-reports-admin.controller'
import { SellerReportsModerationService } from './seller-reports-moderation.service'
import { SellerReportsController } from './seller-reports.controller'
import { SellerReportsService } from './seller-reports.service'

// UserModule и AuthModule нужны AuthGuard; PrismaService приходит из
// глобального PrismaModule, SiteSettingsService (гард флага) — из
// глобального SiteSettingsModule.
@Module({
  imports: [UserModule, AuthModule, NotificationsModule, AdsModule, SellerReviewsModule],
  controllers: [SellerReportsController, SellerReportsAdminController],
  providers: [SellerReportsService, SellerReportsModerationService, SellerAdsSuspensionService]
})
export class SellerReportsModule {}
