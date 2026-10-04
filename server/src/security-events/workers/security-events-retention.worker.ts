import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'

import { SecurityEventsService } from '../security-events.service'

// Ночная очистка журнала безопасности по сроку хранения — см.
// SECURITY_EVENTS_DEFAULT_RETENTION_DAYS (почему срок ограничен вообще:
// IP и устройство — персональные данные).
@Injectable()
export class SecurityEventsRetentionWorker {
  private readonly logger = new Logger(SecurityEventsRetentionWorker.name)

  constructor(private readonly securityEventsService: SecurityEventsService) {}

  @Cron('30 3 * * *') // каждый день в 3:30 (после чистки архива объявлений в 3:00)
  async purgeExpiredEvents() {
    try {
      const deleted = await this.securityEventsService.purgeExpired()

      if (deleted > 0) {
        this.logger.log(`Удалено ${deleted} просроченных записей журнала безопасности`)
      }
    } catch (error) {
      this.logger.error('Не удалось очистить журнал безопасности', error instanceof Error ? error.stack : String(error))
    }
  }
}
