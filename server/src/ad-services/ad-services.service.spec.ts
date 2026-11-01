import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'

import { AdStatus } from '@/generated/prisma/client'
import { AdBadge, AdServiceType } from '@/generated/prisma/enums'

import { AdServicesService } from './ad-services.service'

describe('AdServicesService.createCheckout', () => {
  const config = {
    getOrThrow: (key: string) =>
      ({
        YOOKASSA_SHOP_ID: 'shop',
        YOOKASSA_SECRET_KEY: 'secret',
        ALLOWED_ORIGIN: 'https://agro-zone.ru',
        APPLICATION_URL: 'https://api.agro-zone.ru'
      })[key]
  }
  let prisma: {
    ad: { findFirst: jest.Mock }
    adServicePurchase: { create: jest.Mock; update: jest.Mock }
  }
  let service: AdServicesService
  let fetchSpy: jest.SpyInstance

  const sentBody = () => JSON.parse(fetchSpy.mock.calls[0][1].body)

  beforeEach(() => {
    prisma = {
      ad: { findFirst: jest.fn().mockResolvedValue({ id: 'ad-1', status: AdStatus.PUBLISHED }) },
      adServicePurchase: {
        create: jest.fn().mockResolvedValue({ id: 'purchase-1', amount: 2000 }),
        update: jest.fn()
      }
    }
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'pay-1', confirmation: { confirmation_url: 'https://yookassa.test/pay' } })
    } as Response)
    service = new AdServicesService(prisma as never, config as never)
  })

  afterEach(() => jest.restoreAllMocks())

  it('с сайта возвращает на страницу объявления сайта', async () => {
    await expect(service.createCheckout('ad-1', 'user-1', [AdServiceType.BUMP])).resolves.toEqual({
      confirmationUrl: 'https://yookassa.test/pay',
      purchaseId: 'purchase-1'
    })

    expect(sentBody().confirmation.return_url).toBe('https://agro-zone.ru/ads/ad-1?servicePurchase=purchase-1')
  })

  it('из приложения возвращает через сервер, который перенаправит в приложение', async () => {
    await service.createCheckout('ad-1', 'user-1', [AdServiceType.BUMP], undefined, 'agrozone://payment-return')

    const url = new URL(sentBody().confirmation.return_url)
    expect(`${url.origin}${url.pathname}`).toBe('https://api.agro-zone.ru/payments/yookassa/return')
    expect(url.searchParams.get('to')).toBe('agrozone://payment-return')
    expect(url.searchParams.get('purchase')).toBe('purchase-1')
  })

  it('посторонний адрес возврата отклоняется до чтения объявления и создания платежа', async () => {
    await expect(
      service.createCheckout('ad-1', 'user-1', [AdServiceType.BUMP], undefined, 'https://evil.example/steal')
    ).rejects.toBeInstanceOf(BadRequestException)

    expect(prisma.ad.findFirst).not.toHaveBeenCalled()
    expect(prisma.adServicePurchase.create).not.toHaveBeenCalled()
  })

  it('чужое или несуществующее объявление — 404', async () => {
    prisma.ad.findFirst.mockResolvedValue(null)

    await expect(service.createCheckout('ad-1', 'user-1', [AdServiceType.BUMP])).rejects.toBeInstanceOf(
      NotFoundException
    )
  })

  it('неопубликованное объявление продвигать нельзя — 403', async () => {
    prisma.ad.findFirst.mockResolvedValue({ id: 'ad-1', status: AdStatus.ARCHIVED })

    await expect(service.createCheckout('ad-1', 'user-1', [AdServiceType.BUMP])).rejects.toBeInstanceOf(
      ForbiddenException
    )
  })

  it('значок без выбранного типа — 400', async () => {
    await expect(service.createCheckout('ad-1', 'user-1', [AdServiceType.BADGE])).rejects.toBeInstanceOf(
      BadRequestException
    )
    expect(prisma.adServicePurchase.create).not.toHaveBeenCalled()
  })

  it('значок с типом сохраняется в платеже', async () => {
    await service.createCheckout('ad-1', 'user-1', [AdServiceType.BADGE], AdBadge.URGENT)

    expect(prisma.adServicePurchase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ services: [AdServiceType.BADGE], badge: AdBadge.URGENT })
    })
  })
})
