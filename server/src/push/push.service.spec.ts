import { PushProvider } from '@/generated/prisma/enums'

import { PushService } from './push.service'

describe('PushService', () => {
  let prisma: any
  let sender: { send: jest.Mock }
  let fcmSender: { send: jest.Mock }
  let service: PushService

  beforeEach(() => {
    prisma = {
      pushDevice: {
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([])
      }
    }
    sender = { send: jest.fn().mockResolvedValue('sent') }
    fcmSender = { send: jest.fn().mockResolvedValue('sent') }
    service = new PushService(prisma, sender as any, fcmSender as any)
  })

  it('токен переходит к новому владельцу устройства', async () => {
    await service.registerDevice('u2', { provider: PushProvider.RUSTORE, token: 'tok-123456', appVersion: '1.0.1' })

    expect(prisma.pushDevice.upsert).toHaveBeenCalledWith({
      where: { provider_token: { provider: PushProvider.RUSTORE, token: 'tok-123456' } },
      update: { userId: 'u2', appVersion: '1.0.1', installationId: null },
      create: {
        userId: 'u2',
        provider: PushProvider.RUSTORE,
        token: 'tok-123456',
        appVersion: '1.0.1',
        installationId: null
      }
    })
    expect(prisma.pushDevice.deleteMany).not.toHaveBeenCalled()
  })

  it('на одном телефоне остаётся один канал: токены другого провайдера этой установки удаляются', async () => {
    await service.registerDevice('u1', {
      provider: PushProvider.FCM,
      token: 'fcm-token-123',
      appVersion: '1.0.2',
      installationId: 'install-12345678'
    })

    expect(prisma.pushDevice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { provider_token: { provider: PushProvider.FCM, token: 'fcm-token-123' } },
        update: { userId: 'u1', appVersion: '1.0.2', installationId: 'install-12345678' }
      })
    )
    expect(prisma.pushDevice.deleteMany).toHaveBeenCalledWith({
      where: { installationId: 'install-12345678', provider: { not: PushProvider.FCM } }
    })
  })

  it('отправляет каждое устройство через его провайдера', async () => {
    prisma.pushDevice.findMany.mockResolvedValue([
      { id: 'd1', provider: PushProvider.RUSTORE, token: 'a' },
      { id: 'd2', provider: PushProvider.FCM, token: 'b' }
    ])

    await service.sendToUser('u1', { title: 'T', body: 'B' })

    expect(sender.send).toHaveBeenCalledWith('a', { title: 'T', body: 'B' })
    expect(fcmSender.send).toHaveBeenCalledWith('b', { title: 'T', body: 'B' })
  })

  it('чужой токен удалить нельзя — условие по владельцу', async () => {
    await service.unregisterDevice('u1', PushProvider.RUSTORE, 'tok-123456')

    expect(prisma.pushDevice.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u1', provider: PushProvider.RUSTORE, token: 'tok-123456' }
    })
  })

  it('отправляет на все устройства пользователя', async () => {
    prisma.pushDevice.findMany.mockResolvedValue([
      { id: 'd1', provider: PushProvider.RUSTORE, token: 'a' },
      { id: 'd2', provider: PushProvider.RUSTORE, token: 'b' }
    ])

    await service.sendToUser('u1', { title: 'T', body: 'B' })

    expect(sender.send).toHaveBeenCalledTimes(2)
    expect(prisma.pushDevice.deleteMany).not.toHaveBeenCalled()
  })

  it('продолжение серии получают только каналы, которые умеют обновлять уведомление (FCM)', async () => {
    prisma.pushDevice.findMany.mockResolvedValue([
      { id: 'd1', provider: PushProvider.RUSTORE, token: 'a' },
      { id: 'd2', provider: PushProvider.FCM, token: 'b' }
    ])

    await service.sendToUser('u1', { title: 'T', body: 'B' }, { followUp: true })

    expect(sender.send).not.toHaveBeenCalled()
    expect(fcmSender.send).toHaveBeenCalledWith('b', { title: 'T', body: 'B' })
  })

  it('недействующие токены забываются, живые остаются', async () => {
    prisma.pushDevice.findMany.mockResolvedValue([
      { id: 'dead', provider: PushProvider.RUSTORE, token: 'a' },
      { id: 'alive', provider: PushProvider.RUSTORE, token: 'b' }
    ])
    sender.send.mockResolvedValueOnce('invalid-token').mockResolvedValueOnce('sent')

    await service.sendToUser('u1', { title: 'T', body: 'B' })

    expect(prisma.pushDevice.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['dead'] } } })
  })

  it('сбой не выбрасывается наружу', async () => {
    prisma.pushDevice.findMany.mockRejectedValue(new Error('db down'))

    await expect(service.sendToUser('u1', { title: 'T', body: 'B' })).resolves.toBeUndefined()
  })
})
