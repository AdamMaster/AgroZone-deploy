import { Module } from '@nestjs/common'

import { AuthModule } from '@/auth/auth.module'
import { BlockedUsersModule } from '@/blocked-users/blocked-users.module'
import { UserModule } from '@/user/user.module'

import { SellerRatingsEnabledGuard } from './guards/seller-ratings-enabled.guard'
import { SellerRatingService } from './seller-rating.service'
import { SellerReviewEligibilityService } from './seller-review-eligibility.service'
import { SellerReviewsController, UserReviewsController } from './seller-reviews.controller'
import { SellerReviewsService } from './seller-reviews.service'

// UserModule и AuthModule нужны AuthGuard; SiteSettingsService (гард флага)
// приходит из глобального SiteSettingsModule, PrismaService — из
// глобального PrismaModule.
@Module({
  imports: [UserModule, AuthModule, BlockedUsersModule],
  controllers: [UserReviewsController, SellerReviewsController],
  providers: [SellerReviewsService, SellerReviewEligibilityService, SellerRatingService, SellerRatingsEnabledGuard]
})
export class SellerReviewsModule {}
