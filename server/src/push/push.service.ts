import { Injectable, Logger } from '@nestjs/common'

import { PushProvider } from '@/generated/prisma/enums'
import { PrismaService } from '@/prisma/prisma.service'

import { RegisterPushDeviceDto } from './dto/register-push-device.dto'
import { FcmPushSender } from './providers/fcm-push.sender'
import { RuStorePushSender } from './providers/rustore-push.sender'
import type { PushNotificationPayload, PushSendResult, SendToUserOptions } from './push.types'

// Каналы, у которых уведомление рисует приложение и новое сообщение заменяет
// прежнее. У RuStore уведомление показывает его SDK, заменить его нельзя.
const PUSH_REPLACEABLE_PROVIDERS: ReadonlySet<PushProvider> = new Set([PushProvider.FCM])

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly ruStoreSender: RuStorePushSender,
    private readonly fcmSender: FcmPushSender
  ) {}

  // Токен принадлежит устройству: если на нём вошли под другим аккаунтом,
  // токен переходит к новому владельцу, а не дублируется — иначе пуши прежнего
  // аккаунта продолжали бы приходить на это устройство.
  async registerDevice(userId: string, { provider, token, appVersion, installationId }: RegisterPushDeviceDto) {
    await this.prisma.pushDevice.upsert({
      where: { provider_token: { provider, token } },
      update: { userId, appVersion: appVersion ?? null, installationId: installationId ?? null },
      create: { userId, provider, token, appVersion: appVersion ?? null, installationId: installationId ?? null }
    })

    // На одном телефоне работает один канал: пока он не сменился, токены другого
    // провайдера той же установки удаляются (иначе пуш пришёл бы дважды).
    if (installationId) {
      await this.prisma.pushDevice.deleteMany({ where: { installationId, provider: { not: provider } } })
    }
  }

  // Только свои токены: чужой удалить нельзя. Повтор и неизвестный токен —
  // не ошибка (выход из аккаунта должен проходить всегда).
  async unregisterDevice(userId: string, provider: PushProvider, token: string) {
    await this.prisma.pushDevice.deleteMany({ where: { userId, provider, token } })
  }

  // Отправка на все устройства пользователя. Никогда не бросает: пуш — удобство,
  // и сбой отправки не должен ронять то, ради чего он отправляется (сообщение).
  async sendToUser(
    userId: string,
    payload: PushNotificationPayload,
    { followUp = false }: SendToUserOptions = {}
  ): Promise<void> {
    try {
      const allDevices = await this.prisma.pushDevice.findMany({
        where: { userId },
        select: { id: true, provider: true, token: true }
      })
      const devices = followUp
        ? allDevices.filter(({ provider }) => PUSH_REPLACEABLE_PROVIDERS.has(provider))
        : allDevices

      const results = await Promise.all(
        devices.map(async device => ({
          device,
          result: await this.sendToDevice(device.provider, device.token, payload)
        }))
      )

      this.logger.log(
        `Push пользователю ${userId}${followUp ? ' (обновление серии)' : ''}: устройств ${devices.length}` +
          (devices.length > 0 ? ` (${results.map(({ result }) => result).join(', ')})` : '')
      )

      const staleIds = results.filter(({ result }) => result === 'invalid-token').map(({ device }) => device.id)

      if (staleIds.length > 0) {
        await this.prisma.pushDevice.deleteMany({ where: { id: { in: staleIds } } })
      }
    } catch (error) {
      this.logger.error(`Не удалось отправить push пользователю ${userId}: ${(error as Error).message}`)
    }
  }

  private sendToDevice(
    provider: PushProvider,
    token: string,
    payload: PushNotificationPayload
  ): Promise<PushSendResult> {
    switch (provider) {
      case PushProvider.RUSTORE:
        return this.ruStoreSender.send(token, payload)
      case PushProvider.FCM:
        return this.fcmSender.send(token, payload)
    }
  }
}
