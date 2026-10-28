import { AdStatus } from '@/generated/prisma/enums'

import { AdStateMachineService } from '@/ads/ad-state-machine.service'

import { SellerAdsSuspensionService } from './seller-ads-suspension.service'

const NOW = new Date('2026-10-27T12:00:00.000Z')

describe('SellerAdsSuspensionService', () => {
  let service: SellerAdsSuspensionService
  let tx: { ad: { updateMany: jest.Mock } }

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)
    tx = { ad: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) } }
    service = new SellerAdsSuspensionService(new AdStateMachineService())
  })

  afterEach(() => jest.useRealTimers())

  it('приостанавливает только опубликованные объявления продавца и возвращает их число', async () => {
    tx.ad.updateMany.mockResolvedValue({ count: 4 })

    expect(await service.suspend(tx as never, 'seller')).toBe(4)
    expect(tx.ad.updateMany).toHaveBeenCalledWith({
      where: { userId: 'seller', status: AdStatus.PUBLISHED },
      data: { status: AdStatus.SUSPENDED }
    })
  })

  it('возврат: вышедшие за срок становятся истёкшими, остальные — опубликованными', async () => {
    tx.ad.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 2 })

    expect(await service.restore(tx as never, 'seller')).toBe(3)
    expect(tx.ad.updateMany).toHaveBeenNthCalledWith(1, {
      where: { userId: 'seller', status: AdStatus.SUSPENDED, expiresAt: { lte: NOW } },
      data: { status: AdStatus.EXPIRED }
    })
    expect(tx.ad.updateMany).toHaveBeenNthCalledWith(2, {
      where: { userId: 'seller', status: AdStatus.SUSPENDED },
      data: { status: AdStatus.PUBLISHED }
    })
  })

  it('приостановленных нет — возвращает 0', async () => {
    expect(await service.restore(tx as never, 'seller')).toBe(0)
  })
})
