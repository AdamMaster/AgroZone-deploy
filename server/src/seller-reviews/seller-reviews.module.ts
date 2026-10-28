import { Module } from '@nestjs/common'

import { AuthModule } from '@/auth/auth.module'
import { BlockedUsersModule } from '@/blocked-users/blocked-users.module'
import { NotificationsModule } from '@/notifications/notifications.module'
import { UserModule } from '@/user/user.module'

import { SellerRatingsEnabledGuard } from './guards/seller-ratings-enabled.guard'
import { SellerRatingService } from './seller-rating.service'
import { SellerReviewEligibilityService } from './seller-review-eligibility.service'
import { SellerReviewModerationService } from './seller-review-moderation.service'
import { SellerReviewSignalsService } from './seller-review-signals.service'
import { SellerReviewReportsService } from './seller-review-reports.service'
import { SellerReviewTextFilterService } from './seller-review-text-filter.service'
import { SellerReviewsAdminController } from './seller-reviews-admin.controller'
import { SellerReviewsController, UserReviewsController } from './seller-reviews.controller'
import { SellerReviewsService } from './seller-reviews.service'

// UserModule и AuthModule нужны AuthGuard; SiteSettingsService (гард флага)
// приходит из глобального SiteSettingsModule, PrismaService — из
// глобального PrismaModule.
@Module({
  imports: [UserModule, AuthModule, BlockedUsersModule, NotificationsModule],
  controllers: [UserReviewsController, SellerReviewsController, SellerReviewsAdminController],
  providers: [
    SellerReviewsService,
    SellerReviewEligibilityService,
    SellerRatingService,
    SellerReviewTextFilterService,
    SellerReviewReportsService,
    SellerReviewModerationService,
    SellerReviewSignalsService,
    SellerRatingsEnabledGuard
  ],
  // Для модерации продавцов (SellerReportsModule): откат отзывов, сигналы
  // накрутки и тот же гард флага.
  exports: [SellerRatingService, SellerReviewSignalsService, SellerRatingsEnabledGuard]
})
export class SellerReviewsModule {}
