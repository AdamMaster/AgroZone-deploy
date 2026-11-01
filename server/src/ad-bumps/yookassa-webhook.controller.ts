import { BadRequestException, Body, Controller, Get, HttpCode, Post, Query, Redirect } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'

import { appendQuery, isAllowedMobileRedirectUri } from '@/auth/mobile-oauth/mobile-oauth.service'
import { PaymentReturnQueryDto } from '@/libs/yookassa/dto/payment-return-query.dto'
import { PremiumService } from '@/premium/premium.service'
import { DealerSubscriptionsService } from '@/dealer-feeds/subscriptions/dealer-subscriptions.service'

import { AdBumpsService } from './ad-bumps.service'
import { AdServicesService } from '../ad-services/ad-services.service'

// Публичный урл — сюда стучится сама ЮKassa, без сессии/куки пользователя.
// Этот путь нужно указать в настройках магазина в личном кабинете ЮKassa
// (Настройки → HTTP-уведомления): https://<домен>/payments/yookassa/webhook.
// @SkipThrottle — глобальный лимитер (3 запроса/мин, см. AppModule) не
// должен резать легитимные повторные уведомления от ЮKassa.
//
// Один урл на ВСЕ виды платежей магазина — сейчас это AdBump, PremiumPurchase,
// AdServicePurchase (единая страница "Поднять просмотры") и
// DealerSubscription (дилерский тариф на фиды), дальше могут добавиться
// другие. Каждый сервис сверяет paymentId со своей таблицей и молча
// ничего не делает, если совпадения нет (см. reconcilePayment во всех
// сервисах), поэтому вызывать все безопасно — "чужой" для конкретного
// сервиса вебхук просто не найдёт запись.
@Controller('payments/yookassa')
@SkipThrottle()
export class YookassaWebhookController {
  constructor(
    private readonly adBumpsService: AdBumpsService,
    private readonly premiumService: PremiumService,
    private readonly adServicesService: AdServicesService,
    private readonly dealerSubscriptionsService: DealerSubscriptionsService
  ) {}

  // 200 — на успешный разбор, включая "не наш платёж"/уже обработанный
  // (см. handleWebhook, это не ошибки). Если же перепроверка статуса в
  // самой ЮKassa не удалась (например, сеть), handleWebhook бросает
  // исключение — Nest ответит не-2xx, и ЮKassa повторит вебхук позже,
  // вместо того чтобы платёж навсегда завис в PENDING.
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(@Body() body: unknown) {
    await this.adBumpsService.handleWebhook(body)
    await this.premiumService.handleWebhook(body)
    await this.adServicesService.handleWebhook(body)
    await this.dealerSubscriptionsService.handleWebhook(body)
  }

  // Возврат пользователя из ЮKassa в мобильное приложение. ЮKassa вернёт его
  // сюда обычной https-ссылкой (см. buildReturnUrl), а отсюда сервер
  // перенаправляет в приложение (agrozone://…), как при входе через Яндекс.
  // Адрес приложения обязательно проверяется: иначе это был бы открытый
  // редирект на любой сайт.
  @Get('return')
  @Redirect()
  returnToApp(@Query() { to, purchase }: PaymentReturnQueryDto) {
    if (!isAllowedMobileRedirectUri(to)) {
      throw new BadRequestException('Недопустимый адрес возврата в приложение.')
    }

    return { url: appendQuery(to, { purchase }) }
  }
}
