import { AdStatus } from '@/generated/prisma/client'

import { AdAutoBumpWorker } from './ad-auto-bump.worker'

const DAY_MS = 24 * 60 * 60 * 1000

describe('AdAutoBumpWorker', () => {
  const NOW = new Date('2026-11-01T12:00:00.000Z')
  let prisma: { ad: { updateMany: jest.Mock } }
  let worker: AdAutoBumpWorker

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)
    prisma = { ad: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) } }
    worker = new AdAutoBumpWorker(prisma as never)
  })

  afterEach(() => jest.useRealTimers())

  it('отбор и обновление идут одним запросом: устарело И есть право на поднятие, только опубликованные', async () => {
    await worker.handleAutoBump()

    expect(prisma.ad.updateMany).toHaveBeenCalledTimes(1)
    expect(prisma.ad.updateMany).toHaveBeenCalledWith({
      where: {
        status: AdStatus.PUBLISHED,
        AND: [
          { OR: [{ bumpedAt: null }, { bumpedAt: { lte: new Date(NOW.getTime() - DAY_MS) } }] },
          { OR: [{ bumpServiceUntil: { gt: NOW } }, { user: { premiumUntil: { gt: NOW } } }] }
        ]
      },
      data: { bumpedAt: NOW }
    })
  })

  it('ничего не подходит — просто выходит без ошибок', async () => {
    await expect(worker.handleAutoBump()).resolves.toBeUndefined()
  })

  it('ошибка БД не глотается — крон-планировщик её залогирует', async () => {
    prisma.ad.updateMany.mockRejectedValue(new Error('db down'))

    await expect(worker.handleAutoBump()).rejects.toThrow('db down')
  })
})
