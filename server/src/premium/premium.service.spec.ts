import { PremiumPurchaseStatus } from '@/generated/prisma/enums'

import { PremiumService } from './premium.service'

const PAYMENT_ID = 'pay-1'
const webhook = { event: 'payment.succeeded', object: { id: PAYMENT_ID } }

describe('PremiumService: обработка платежа ЮKassa', () => {
  let service: PremiumService
  let tx: {
    premiumPurchase: { updateMany: jest.Mock; findUniqueOrThrow: jest.Mock }
    user: { findUniqueOrThrow: jest.Mock; update: jest.Mock }
    ad: { updateMany: jest.Mock }
  }
  let prisma: { premiumPurchase: { findUnique: jest.Mock; update: jest.Mock }; $transaction: jest.Mock }

  const mockYookassaStatus = (status: string) =>
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: PAYMENT_ID, status }) } as Response)

  beforeEach(() => {
    tx = {
      premiumPurchase: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'purchase-1', status: PremiumPurchaseStatus.SUCCEEDED })
      },
      user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ premiumUntil: null }), update: jest.fn() },
      ad: { updateMany: jest.fn() }
    }
    prisma = {
      premiumPurchase: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'purchase-1', userId: 'user-1', status: PremiumPurchaseStatus.PENDING }),
        update: jest.fn()
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx))
    }

    service = new PremiumService(prisma as never, { getOrThrow: () => 'secret' } as never)
  })

  afterEach(() => jest.restoreAllMocks())

  it('оплаченный премиум продлевается один раз и платёж закрывается', async () => {
    mockYookassaStatus('succeeded')

    await service.handleWebhook(webhook)

    expect(tx.premiumPurchase.updateMany).toHaveBeenCalledWith({
      where: { id: 'purchase-1', status: PremiumPurchaseStatus.PENDING },
      data: { status: PremiumPurchaseStatus.SUCCEEDED, paidAt: expect.any(Date) }
    })
    expect(tx.user.update).toHaveBeenCalledTimes(1)
    expect(tx.ad.updateMany).toHaveBeenCalledTimes(1)
  })

  it('параллельная обработка того же платежа премиум второй раз не продлевает', async () => {
    mockYookassaStatus('succeeded')
    tx.premiumPurchase.updateMany.mockResolvedValue({ count: 0 })

    await service.handleWebhook(webhook)

    expect(tx.user.update).not.toHaveBeenCalled()
    expect(tx.ad.updateMany).not.toHaveBeenCalled()
  })
})
