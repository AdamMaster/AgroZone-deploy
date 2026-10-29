import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { PUSH_SEND_TIMEOUT_MS } from '../constants/push.constants'
import type { PushNotificationPayload, PushSendResult } from '../push.types'

interface RuStoreErrorResponse {
  error?: { code?: number; message?: string; status?: string }
}

// Отправка через RuStore Push (https://www.rustore.ru/help/sdk/push-notifications/send-push-notifications):
// POST на vkpns.rustore.ru с сервисным токеном проекта. Проект и токен берутся в
// RuStore Консоли (приложение → Push-уведомления → Проекты) и лежат в
// server/.env: RUSTORE_PUSH_PROJECT_ID, RUSTORE_PUSH_SERVICE_TOKEN. Пока их нет,
// отправка тихо пропускается — сервер работает как раньше.
@Injectable()
export class RuStorePushSender {
  private readonly logger = new Logger(RuStorePushSender.name)
  private warnedNotConfigured = false

  constructor(private readonly configService: ConfigService) {}

  async send(token: string, payload: PushNotificationPayload): Promise<PushSendResult> {
    const projectId = this.configService.get<string>('RUSTORE_PUSH_PROJECT_ID')
    const serviceToken = this.configService.get<string>('RUSTORE_PUSH_SERVICE_TOKEN')

    if (!projectId || !serviceToken) {
      if (!this.warnedNotConfigured) {
        this.warnedNotConfigured = true
        this.logger.warn('RUSTORE_PUSH_PROJECT_ID / RUSTORE_PUSH_SERVICE_TOKEN не заданы — push не отправляются')
      }

      return 'skipped'
    }

    try {
      const response = await fetch(
        `https://vkpns.rustore.ru/v1/projects/${encodeURIComponent(projectId)}/messages:send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceToken}` },
          body: JSON.stringify(this.buildBody(token, payload)),
          signal: AbortSignal.timeout(PUSH_SEND_TIMEOUT_MS)
        }
      )

      if (response.ok) return 'sent'

      const { error } = (await response.json().catch(() => ({}))) as RuStoreErrorResponse

      if (this.isInvalidToken(response.status, error)) return 'invalid-token'

      this.logger.error(`RuStore Push: ${response.status} ${error?.status ?? ''} ${error?.message ?? ''}`.trim())

      return 'failed'
    } catch (error) {
      this.logger.error(`RuStore Push: запрос не удался: ${(error as Error).message}`)

      return 'failed'
    }
  }

  // Заголовок обязателен, иначе SDK уведомление не покажет. Нажатие открывает
  // deep link (click_action_type 1): так приложение само открывает нужный чат.
  private buildBody(token: string, { title, body, link, data }: PushNotificationPayload) {
    return {
      message: {
        token,
        ...(data && { data }),
        android: {
          notification: {
            title,
            body,
            ...(link && { click_action: link, click_action_type: 1 })
          }
        }
      }
    }
  }

  // NOT_FOUND — токена нет или он устарел; INVALID_ARGUMENT с упоминанием
  // токена — токен кривой. Любую другую 400 (например, ошибку в теле) токен не
  // портит: удалять из-за неё устройства нельзя.
  private isInvalidToken(httpStatus: number, error?: RuStoreErrorResponse['error']): boolean {
    if (httpStatus === 404 || error?.status === 'NOT_FOUND') return true

    return error?.status === 'INVALID_ARGUMENT' && /token/i.test(error.message ?? '')
  }
}
