import { Module } from '@nestjs/common'

import { PrismaService } from '@/prisma/prisma.service'
import { AuthModule } from '@/auth/auth.module'
import { UserModule } from '@/user/user.module'
import { FileModule } from '@/file/file.module'
import { CategoriesModule } from '@/categories/categories.module'

import { DealerFeedsController } from './dealer-feeds.controller'
import { DealerFeedsService } from './dealer-feeds.service'
import { DealerFeedParserService } from './parser/dealer-feed-parser.service'
import { DealerFeedGeocodingService } from './geocoding/dealer-feed-geocoding.service'
import { DealerFeedPhotosService } from './photos/dealer-feed-photos.service'
import { DealerFeedSyncService } from './sync/dealer-feed-sync.service'
import { DealerFeedSyncWorker } from './workers/dealer-feed-sync.worker'
import { DealerSubscriptionsService } from './subscriptions/dealer-subscriptions.service'

@Module({
  // AuthModule экспортирует только AuthService — UserService (от него
  // зависит сам AuthGuard) нужно тянуть отдельно из UserModule, тем же
  // способом, что и в AdsModule/остальных модулях с защищёнными роутами.
  // FileModule — за FileService (перезаливка фото дилера в S3, см.
  // DealerFeedPhotosService). CategoriesModule — за CategoriesService
  // (categoryPath/seoPath при создании объявления из фида, см.
  // DealerFeedSyncService).
  imports: [AuthModule, UserModule, FileModule, CategoriesModule],
  controllers: [DealerFeedsController],
  providers: [
    DealerFeedsService,
    DealerFeedParserService,
    DealerFeedGeocodingService,
    DealerFeedPhotosService,
    DealerFeedSyncService,
    DealerFeedSyncWorker,
    DealerSubscriptionsService,
    PrismaService
  ],
  // DealerSubscriptionsService — общий вебхук ЮKassa
  // (YookassaWebhookController, физически лежит в ad-bumps/) должен уметь
  // реконсилить и платежи за дилерский тариф, тем же приёмом, что и
  // PremiumModule экспортирует PremiumService туда же (см. там).
  exports: [DealerSubscriptionsService]
})
export class DealerFeedsModule {}
