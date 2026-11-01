import { AdBumpStatus } from '@/generated/prisma/enums'

import { AdBumpsService } from './ad-bumps.service'

const PAYMENT_ID = 'pay-1'
const webhook = { event: 'payment.succeeded', object: { id: PAYMENT_ID } }

describe('AdBumpsService: обработка платежа ЮKassa', () => {
  let service: AdBumpsService
  let tx: {
    adBump: { updateMany: jest.Mock; findUniqueOrThrow: jest.Mock }
    ad: { findUniqueOrThrow: jest.Mock; update: jest.Mock }
  }
  let prisma: {
    adBump: { findUnique: jest.Mock; update: jest.Mock }
    $transaction: jest.Mock
  }

  const mockYookassaStatus = (status: string) =>
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ id: PAYMENT_ID, status }) } as Response)

  beforeEach(() => {
    tx = {
      adBump: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'bump-1', status: AdBumpStatus.SUCCEEDED })
      },
      ad: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ bumpServiceUntil: null }),
        update: jest.fn().mockResolvedValue({})
      }
    }
    prisma = {
      adBump: {
        findUnique: jest.fn().mockResolvedValue({ id: 'bump-1', adId: 'ad-1', status: AdBumpStatus.PENDING }),
        update: jest.fn()
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) => callback(tx))
    }

    service = new AdBumpsService(prisma as never, { getOrThrow: () => 'secret' } as never)
  })

  afterEach(() => jest.restoreAllMocks())

  it('оплаченное поднятие выдаётся один раз и платёж закрывается', async () => {
    mockYookassaStatus('succeeded')

    await service.handleWebhook(webhook)

    expect(tx.adBump.updateMany).toHaveBeenCalledWith({
      where: { id: 'bump-1', status: AdBumpStatus.PENDING },
      data: { status: AdBumpStatus.SUCCEEDED, paidAt: expect.any(Date) }
    })
    expect(tx.ad.update).toHaveBeenCalledTimes(1)
  })

  it('параллельная обработка того же платежа услугу второй раз не выдаёт', async () => {
    mockYookassaStatus('succeeded')
    // Вторая ветка (вебхук + проверка статуса) увидела PENDING до транзакции, но
    // к её UPDATE платёж уже закрыт первой: PENDING не нашёлся.
    tx.adBump.updateMany.mockResolvedValue({ count: 0 })

    await service.handleWebhook(webhook)

    expect(tx.ad.update).not.toHaveBeenCalled()
  })

  it('уже обработанный платёж не перепроверяется в ЮKassa', async () => {
    const fetchSpy = mockYookassaStatus('succeeded')
    prisma.adBump.findUnique.mockResolvedValue({ id: 'bump-1', status: AdBumpStatus.SUCCEEDED })

    await service.handleWebhook(webhook)

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('отменённый платёж отменяет попытку и ничего не выдаёт', async () => {
    mockYookassaStatus('canceled')

    await service.handleWebhook(webhook)

    expect(prisma.adBump.update).toHaveBeenCalledWith({
      where: { id: 'bump-1' },
      data: { status: AdBumpStatus.CANCELED }
    })
    expect(tx.ad.update).not.toHaveBeenCalled()
  })
})
