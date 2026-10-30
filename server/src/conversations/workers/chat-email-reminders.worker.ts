import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'

import { ChatEmailRemindersService } from '../chat-email-reminders.service'

// Раз в минуту рассылает письма о сообщениях, которые к назначенному времени
// остались непрочитанными (см. ChatEmailRemindersService).
@Injectable()
export class ChatEmailRemindersWorker {
  private readonly logger = new Logger(ChatEmailRemindersWorker.name)

  // Запуск, который длится дольше минуты (медленная почта), не должен
  // накладываться на следующий.
  private running = false

  constructor(private readonly chatEmailRemindersService: ChatEmailRemindersService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sendDueEmails() {
    if (this.running) return

    this.running = true

    try {
      const sent = await this.chatEmailRemindersService.processDue()

      if (sent > 0) {
        this.logger.log(`Отправлено писем о новых сообщениях: ${sent}`)
      }
    } catch (error) {
      this.logger.error(
        'Не удалось обработать письма о сообщениях',
        error instanceof Error ? error.stack : String(error)
      )
    } finally {
      this.running = false
    }
  }
}
