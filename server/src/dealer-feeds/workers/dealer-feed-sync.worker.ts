import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'

import { PrismaService } from '@/prisma/prisma.service'
import { DealerFeedStatus } from '@/generated/prisma/client'

import { DealerFeedSyncService } from '../sync/dealer-feed-sync.service'

// Периодическая синхронизация всех одобренных, не приостановленных фидов
// с действующим тарифом — раз в DEALER_FEED_SYNC_INTERVAL_HOURS часов (см.
// константу; если меняете интервал, поменяйте и cron-выражение ниже —
// декоратору нужна строка на этапе объявления класса).
//
// Синхронизирует фиды ПОСЛЕДОВАТЕЛЬНО, не параллельно — при десятках
// дилеров параллельный запуск создал бы всплеск одновременных запросов и
// к DaData (геокодирование), и к S3 (заливка фото), и к серверам самих
// дилеров разом. Один медленный/битый фид максимум откладывает следующий
// на длительность собственного таймаута (см. DEALER_FEED_FETCH_TIMEOUT_MS
// и DEALER_FEED_IMAGE_FETCH_TIMEOUT_MS в константах) — приемлемо для
// фоновой задачи раз в несколько часов.
@Injectable()
export class DealerFeedSyncWorker {
  private readonly logger = new Logger(DealerFeedSyncWorker.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: DealerFeedSyncService
  ) {}

  @Cron('0 */4 * * *')
  async handleScheduledSync() {
    const now = new Date()

    const feeds = await this.prisma.dealerFeed.findMany({
      where: {
        status: DealerFeedStatus.APPROVED,
        isPaused: false,
        subscriptionUntil: { gt: now }
      }
    })

    if (feeds.length === 0) return

    this.logger.log(`DealerFeedSyncWorker: синхронизация ${feeds.length} фидов`)

    for (const feed of feeds) {
      await this.syncService.syncOne(feed).catch(error => {
        this.logger.error(`Не удалось синхронизировать фид ${feed.id}`, error as Error)
      })
    }
  }
}
