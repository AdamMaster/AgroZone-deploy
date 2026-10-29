import { PushProvider } from '@/generated/prisma/enums'

import { PushService } from './push.service'

describe('PushService', () => {
  let prisma: any
  let sender: { send: jest.Mock }
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
    service = new PushService(prisma, sender as any)
  })

  it('токен переходит к новому владельцу устройства', async () => {
    await service.registerDevice('u2', { provider: PushProvider.RUSTORE, token: 'tok-123456', appVersion: '1.0.1' })

    expect(prisma.pushDevice.upsert).toHaveBeenCalledWith({
      where: { provider_token: { provider: PushProvider.RUSTORE, token: 'tok-123456' } },
      update: { userId: 'u2', appVersion: '1.0.1' },
      create: { userId: 'u2', provider: PushProvider.RUSTORE, token: 'tok-123456', appVersion: '1.0.1' }
    })
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
