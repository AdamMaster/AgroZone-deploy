import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'

import { PrismaService } from '@/prisma/prisma.service'

import { AD_PHONE_REVEALS_RETENTION_DAYS } from '../constants/ads.constants'

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Ночная очистка журнала показа номера по сроку хранения — см.
// AD_PHONE_REVEALS_RETENTION_DAYS (зачем журнал и почему он не бессрочный).
// Удаляется одним запросом: записей на пару «пользователь — объявление» одна,
// выборка по createdAt идёт раз в сутки и таблицу надолго не блокирует.
@Injectable()
export class AdPhoneRevealsRetentionWorker {
  private readonly logger = new Logger(AdPhoneRevealsRetentionWorker.name)

  constructor(private readonly prisma: PrismaService) {}

  @Cron('45 3 * * *') // каждый день в 3:45 (после чистки журнала безопасности в 3:30)
  async purgeExpiredReveals() {
    try {
      const deleted = await this.purgeExpired()

      if (deleted > 0) {
        this.logger.log(`Удалено ${deleted} просроченных записей журнала показа номера`)
      }
    } catch (error) {
      this.logger.error(
        'Не удалось очистить журнал показа номера',
        error instanceof Error ? error.stack : String(error)
      )
    }
  }

  // Удаляет записи старше срока хранения, возвращает, сколько удалено.
  async purgeExpired(now: Date = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - AD_PHONE_REVEALS_RETENTION_DAYS * MS_PER_DAY)
    const { count } = await this.prisma.adPhoneReveal.deleteMany({ where: { createdAt: { lt: cutoff } } })

    return count
  }
}
