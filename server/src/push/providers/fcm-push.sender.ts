import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createSign } from 'node:crypto'

import {
  FCM_MESSAGE_TTL_SECONDS,
  FCM_TOKEN_REFRESH_MARGIN_MS,
  PUSH_SEND_TIMEOUT_MS
} from '../constants/push.constants'
import type { PushNotificationPayload, PushSendResult } from '../push.types'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'

interface ServiceAccount {
  projectId: string
  clientEmail: string
  privateKey: string
}

interface FcmErrorResponse {
  error?: {
    code?: number
    message?: string
    status?: string
    details?: Array<{ errorCode?: string }>
  }
}

// Отправка через Firebase Cloud Messaging (HTTP v1):
// https://firebase.google.com/docs/cloud-messaging/send-message
// Ключ сервисного аккаунта (Firebase Console → Project settings → Service
// accounts → Generate new private key) целиком, в base64, лежит в
// server/.env: FCM_SERVICE_ACCOUNT_BASE64. Пока его нет, отправка тихо
// пропускается — работает только RuStore.
//
// Сообщения только с data: заголовок, текст и ссылку показывает само
// приложение (MessagingService в modules/firebase-push), поэтому уведомление
// одинаково выглядит и когда приложение закрыто, и когда открыто.
@Injectable()
export class FcmPushSender {
  private readonly logger = new Logger(FcmPushSender.name)
  private warnedNotConfigured = false
  private serviceAccount: ServiceAccount | null | undefined
  private accessToken: { value: string; expiresAt: number } | null = null
  private accessTokenRequest: Promise<string> | null = null

  constructor(private readonly configService: ConfigService) {}

  async send(token: string, payload: PushNotificationPayload): Promise<PushSendResult> {
    const account = this.getServiceAccount()

    if (!account) {
      if (!this.warnedNotConfigured) {
        this.warnedNotConfigured = true
        this.logger.warn('FCM_SERVICE_ACCOUNT_BASE64 не задан или не читается — push через FCM не отправляются')
      }

      return 'skipped'
    }

    try {
      const accessToken = await this.getAccessToken(account)
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.projectId)}/messages:send`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
          body: JSON.stringify(this.buildBody(token, payload)),
          signal: AbortSignal.timeout(PUSH_SEND_TIMEOUT_MS)
        }
      )

      if (response.ok) return 'sent'

      const { error } = (await response.json().catch(() => ({}))) as FcmErrorResponse

      if (response.status === 401) this.accessToken = null

      if (this.isInvalidToken(response.status, error)) return 'invalid-token'

      this.logger.error(`FCM: ${response.status} ${error?.status ?? ''} ${error?.message ?? ''}`.trim())

      return 'failed'
    } catch (error) {
      this.logger.error(`FCM: запрос не удался: ${(error as Error).message}`)

      return 'failed'
    }
  }

  // Только data (значения — строки): показывает приложение. Высокий приоритет
  // будит телефон сразу, а не при следующей синхронизации.
  private buildBody(token: string, { title, body, link, data }: PushNotificationPayload) {
    return {
      message: {
        token,
        data: { ...data, title, body, ...(link && { link }) },
        android: { priority: 'HIGH', ttl: `${FCM_MESSAGE_TTL_SECONDS}s` }
      }
    }
  }

  // UNREGISTERED / 404 — приложение удалено или токен сменился; INVALID_ARGUMENT
  // про токен — токен кривой. Любую другую 400 (ошибка в теле) токен не портит.
  private isInvalidToken(httpStatus: number, error?: FcmErrorResponse['error']): boolean {
    if (httpStatus === 404 || error?.status === 'NOT_FOUND') return true
    if (error?.details?.some(detail => detail.errorCode === 'UNREGISTERED')) return true

    return error?.status === 'INVALID_ARGUMENT' && /token/i.test(error.message ?? '')
  }

  private getServiceAccount(): ServiceAccount | null {
    if (this.serviceAccount !== undefined) return this.serviceAccount

    this.serviceAccount = this.parseServiceAccount(this.configService.get<string>('FCM_SERVICE_ACCOUNT_BASE64'))

    return this.serviceAccount
  }

  private parseServiceAccount(encoded?: string): ServiceAccount | null {
    if (!encoded) return null

    try {
      const json = JSON.parse(Buffer.from(encoded.trim(), 'base64').toString('utf8')) as {
        project_id?: string
        client_email?: string
        private_key?: string
      }

      if (!json.project_id || !json.client_email || !json.private_key) return null

      return { projectId: json.project_id, clientEmail: json.client_email, privateKey: json.private_key }
    } catch {
      return null
    }
  }

  // OAuth-токен Google живёт час: берём один раз и обновляем незадолго до
  // конца. Параллельные отправки ждут один общий запрос, а не плодят свои.
  private async getAccessToken(account: ServiceAccount): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt - FCM_TOKEN_REFRESH_MARGIN_MS > Date.now()) {
      return this.accessToken.value
    }

    this.accessTokenRequest ??= this.requestAccessToken(account).finally(() => {
      this.accessTokenRequest = null
    })

    return this.accessTokenRequest
  }

  private async requestAccessToken(account: ServiceAccount): Promise<string> {
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: this.signJwt(account)
      }),
      signal: AbortSignal.timeout(PUSH_SEND_TIMEOUT_MS)
    })

    if (!response.ok) {
      throw new Error(`Google OAuth: ${response.status} ${await response.text().catch(() => '')}`.trim())
    }

    const { access_token, expires_in } = (await response.json()) as { access_token: string; expires_in: number }

    this.accessToken = { value: access_token, expiresAt: Date.now() + expires_in * 1000 }

    return access_token
  }

  private signJwt({ clientEmail, privateKey }: ServiceAccount): string {
    const now = Math.floor(Date.now() / 1000)
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
    const unsigned = `${encode({ alg: 'RS256', typ: 'JWT' })}.${encode({
      iss: clientEmail,
      scope: FCM_SCOPE,
      aud: GOOGLE_TOKEN_URL,
      iat: now,
      exp: now + 3600
    })}`

    return `${unsigned}.${createSign('RSA-SHA256').update(unsigned).sign(privateKey, 'base64url')}`
  }
}
