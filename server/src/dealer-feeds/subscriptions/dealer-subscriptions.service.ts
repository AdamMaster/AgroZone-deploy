import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { PrismaService } from '@/prisma/prisma.service'
import { DealerSubscriptionStatus, DealerTier } from '@/generated/prisma/client'

import { DEALER_SUBSCRIPTION_DURATION_DAYS, DEALER_TIER_PRICE_KOPECKS } from '../constants/dealer-feeds.constants'

const YOOKASSA_API_URL = 'https://api.yookassa.ru/v3'

interface YookassaPayment {
  id: string
  status: 'pending' | 'waiting_for_capture' | 'succeeded' | 'canceled'
  confirmation?: { confirmation_url?: string }
}

// Покупка дилерского тарифа — по структуре и логике оплаты почти
// copy-paste PremiumService (см. подробные комментарии там): тот же
// одноразовый чекаут в ЮKassa, та же перепроверка статуса вместо доверия
// вебхуку, то же продление "лесенкой" вместо перезаписи текущей даты.
// Отличия: тариф (DealerTier) выбирается при покупке и ВСЕГДА
// перезаписывается на новый (в отличие от даты — если дилер меняет
// тариф, это должно применяться сразу, а не складываться с предыдущим
// выбором, см. обсуждение), и эффект покупки не на самом пользователе
// (User.premiumUntil), а на его DealerFeed
// (subscriptionTier/subscriptionUntil).
@Injectable()
export class DealerSubscriptionsService {
  private readonly logger = new Logger(DealerSubscriptionsService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

  private get authHeader(): string {
    const shopId = this.configService.getOrThrow<string>('YOOKASSA_SHOP_ID')
    const secretKey = this.configService.getOrThrow<string>('YOOKASSA_SECRET_KEY')
    return 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64')
  }

  async createCheckout(userId: string, tier: DealerTier) {
    const feed = await this.prisma.dealerFeed.findUnique({ where: { userId } })

    if (!feed) {
      throw new NotFoundException('Сначала подключите фид, прежде чем оформлять тариф')
    }

    const amount = DEALER_TIER_PRICE_KOPECKS[tier]

    const subscription = await this.prisma.dealerSubscription.create({
      data: { dealerFeedId: feed.id, userId, tier, amount }
    })

    const returnUrl = `${this.configService.getOrThrow<string>('ALLOWED_ORIGIN')}/profile/settings/feeds?subscription=${subscription.id}`

    let payment: YookassaPayment

    try {
      const response = await fetch(`${YOOKASSA_API_URL}/payments`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          'Idempotence-Key': subscription.id
        },
        body: JSON.stringify({
          amount: { value: (subscription.amount / 100).toFixed(2), currency: 'RUB' },
          confirmation: { type: 'redirect', return_url: returnUrl },
          capture: true,
          description: `Дилерский тариф "${tier}" на ${DEALER_SUBSCRIPTION_DURATION_DAYS} дней`,
          metadata: { dealerSubscriptionId: subscription.id }
        })
      })

      if (!response.ok) {
        this.logger.error(
          `ЮKassa вернула ${response.status} при создании платежа для DealerSubscription ${subscription.id}`
        )
        throw new InternalServerErrorException('Не удалось создать платёж')
      }

      payment = await response.json()
    } catch (error) {
      await this.prisma.dealerSubscription.update({
        where: { id: subscription.id },
        data: { status: DealerSubscriptionStatus.CANCELED }
      })
      throw error
    }

    await this.prisma.dealerSubscription.update({
      where: { id: subscription.id },
      data: { yookassaPaymentId: payment.id }
    })

    if (!payment.confirmation?.confirmation_url) {
      throw new InternalServerErrorException('ЮKassa не вернула ссылку на оплату')
    }

    return { confirmationUrl: payment.confirmation.confirmation_url, subscriptionId: subscription.id }
  }

  async handleWebhook(body: unknown) {
    const paymentId = this.extractPaymentId(body)
    if (!paymentId) return
    await this.reconcilePayment(paymentId)
  }

  async checkStatus(subscriptionId: string, userId: string) {
    const subscription = await this.prisma.dealerSubscription.findFirst({ where: { id: subscriptionId, userId } })

    if (!subscription) {
      throw new NotFoundException('Платёж не найден')
    }

    if (!subscription.yookassaPaymentId) {
      return subscription
    }

    return (await this.reconcilePayment(subscription.yookassaPaymentId)) ?? subscription
  }

  private async reconcilePayment(paymentId: string) {
    const subscription = await this.prisma.dealerSubscription.findUnique({ where: { yookassaPaymentId: paymentId } })

    if (!subscription || subscription.status !== DealerSubscriptionStatus.PENDING) {
      return subscription
    }

    const response = await fetch(`${YOOKASSA_API_URL}/payments/${paymentId}`, {
      headers: { Authorization: this.authHeader }
    })

    if (!response.ok) {
      this.logger.error(`Не удалось перепроверить платёж ${paymentId} в ЮKassa: ${response.status}`)
      throw new InternalServerErrorException('Не удалось перепроверить платёж')
    }

    const payment: YookassaPayment = await response.json()

    if (payment.status === 'succeeded') {
      return this.prisma.$transaction(async tx => {
        const feed = await tx.dealerFeed.findUniqueOrThrow({
          where: { id: subscription.dealerFeedId },
          select: { subscriptionUntil: true }
        })

        const now = new Date()
        const base = feed.subscriptionUntil && feed.subscriptionUntil > now ? feed.subscriptionUntil : now
        const subscriptionUntil = new Date(base.getTime() + DEALER_SUBSCRIPTION_DURATION_DAYS * 24 * 60 * 60 * 1000)

        await tx.dealerFeed.update({
          where: { id: subscription.dealerFeedId },
          data: { subscriptionTier: subscription.tier, subscriptionUntil }
        })

        return tx.dealerSubscription.update({
          where: { id: subscription.id },
          data: { status: DealerSubscriptionStatus.SUCCEEDED, paidAt: now }
        })
      })
    }

    if (payment.status === 'canceled') {
      return this.prisma.dealerSubscription.update({
        where: { id: subscription.id },
        data: { status: DealerSubscriptionStatus.CANCELED }
      })
    }

    return subscription
  }

  private extractPaymentId(body: unknown): string | undefined {
    if (typeof body !== 'object' || body === null || !('object' in body)) {
      return undefined
    }

    const paymentObject = (body as { object?: unknown }).object

    if (typeof paymentObject !== 'object' || paymentObject === null || !('id' in paymentObject)) {
      return undefined
    }

    const id = (paymentObject as { id?: unknown }).id

    return typeof id === 'string' ? id : undefined
  }
}
