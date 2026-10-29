import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'

import { RegistrationAttemptsService } from '../registration-attempts.service'

// Ночная очистка журнала попыток регистрации по сроку хранения (см.
// REGISTRATION_ATTEMPTS_RETENTION_DAYS: в журнале телефоны, почты и IP).
@Injectable()
export class RegistrationAttemptsRetentionWorker {
  private readonly logger = new Logger(RegistrationAttemptsRetentionWorker.name)

  constructor(private readonly registrationAttemptsService: RegistrationAttemptsService) {}

  @Cron('15 3 * * *') // каждый день в 3:15
  async purgeExpiredAttempts() {
    try {
      const deleted = await this.registrationAttemptsService.purgeExpired()

      if (deleted > 0) {
        this.logger.log(`Удалено ${deleted} просроченных записей журнала регистраций`)
      }
    } catch (error) {
      this.logger.error('Не удалось очистить журнал регистраций', error instanceof Error ? error.stack : String(error))
    }
  }
}
