import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { AdStatus } from '@/generated/prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

// Общий фоновый воркер для ДВУХ платных механик сразу — платной услуги
// "Поднять объявление" (Ad.bumpServiceUntil, см. AdBumpsService) и
// премиум-аккаунта (User.premiumUntil, см. PremiumService). Обе дают один
// и тот же эффект — раз в сутки объявление снова становится "свежим"
// (bumpedAt = now), что двигает его в топ обычной сортировки
// (ads.sort_at = COALESCE(bumped_at, created_at), DESC в AdsService.findAll). Ничего
// больше не нужно: премиум автоматически будет обгонять разовую услугу,
// как только у той закончится bumpServiceUntil, — это уже гарантируется
// самой сортировкой, без отдельной "тиражной" логики.
//
// Специально ОДИН воркер на оба случая, а не два отдельных — сама
// проверка "нужно ли поднять" отличается только условием eligibility,
// действие (bumpedAt = now) одно и то же.
@Injectable()
export class AdAutoBumpWorker {
  private readonly logger = new Logger(AdAutoBumpWorker.name)

  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 * * * *') // каждый час
  async handleAutoBump() {
    const now = new Date()
    // "Устарело" — bumpedAt пуст или ему больше ~24 часов. Проверяем раз в
    // час, а не раз в сутки, чтобы не собирать всех разом в одну и ту же
    // минуту — но реальный эффект для каждого объявления всё равно
    // получается "раз в районе суток".
    const staleThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Отбор целиком в SQL и одним UPDATE: объявления без платной услуги и без
    // премиума (почти весь каталог) в приложение не попадают вовсе. Два условия
    // OR (устарел И имеет право на поднятие) складываются через AND.
    const result = await this.prisma.ad.updateMany({
      where: {
        status: AdStatus.PUBLISHED,
        AND: [
          { OR: [{ bumpedAt: null }, { bumpedAt: { lte: staleThreshold } }] },
          { OR: [{ bumpServiceUntil: { gt: now } }, { user: { premiumUntil: { gt: now } } }] }
        ]
      },
      data: { bumpedAt: now }
    })

    if (result.count > 0) {
      this.logger.log(`AdAutoBumpWorker: автоматически поднято объявлений: ${result.count}`)
    }
  }
}
