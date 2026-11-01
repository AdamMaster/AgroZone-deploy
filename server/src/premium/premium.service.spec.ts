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

describe('PremiumService.createCheckout: адрес возврата', () => {
  const config = {
    getOrThrow: (key: string) =>
      ({
        YOOKASSA_SHOP_ID: 'shop',
        YOOKASSA_SECRET_KEY: 'secret',
        ALLOWED_ORIGIN: 'https://agro-zone.ru',
        APPLICATION_URL: 'https://api.agro-zone.ru'
      })[key]
  }
  let prisma: { premiumPurchase: { create: jest.Mock; update: jest.Mock } }
  let service: PremiumService
  let fetchSpy: jest.SpyInstance

  const sentReturnUrl = () => JSON.parse(fetchSpy.mock.calls[0][1].body).confirmation.return_url as string

  beforeEach(() => {
    prisma = {
      premiumPurchase: {
        create: jest.fn().mockResolvedValue({ id: 'purchase-1', amount: 1000 }),
        update: jest.fn()
      }
    }
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'pay-1', confirmation: { confirmation_url: 'https://yookassa.test/pay' } })
    } as Response)
    service = new PremiumService(prisma as never, config as never)
  })

  afterEach(() => jest.restoreAllMocks())

  it('с сайта возвращает на страницу премиума сайта', async () => {
    await expect(service.createCheckout('user-1')).resolves.toEqual({
      confirmationUrl: 'https://yookassa.test/pay',
      purchaseId: 'purchase-1'
    })

    expect(sentReturnUrl()).toBe('https://agro-zone.ru/profile/settings/premium?purchase=purchase-1')
  })

  it('из приложения возвращает через сервер, который перенаправит в приложение', async () => {
    await service.createCheckout('user-1', 'agrozone://payment-return')

    const url = new URL(sentReturnUrl())
    expect(`${url.origin}${url.pathname}`).toBe('https://api.agro-zone.ru/payments/yookassa/return')
    expect(url.searchParams.get('to')).toBe('agrozone://payment-return')
    expect(url.searchParams.get('purchase')).toBe('purchase-1')
  })

  it('посторонний адрес возврата отклоняется до создания платежа', async () => {
    await expect(service.createCheckout('user-1', 'https://evil.example/steal')).rejects.toThrow(
      'Недопустимый адрес возврата'
    )

    expect(prisma.premiumPurchase.create).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
