import { Injectable, Logger } from '@nestjs/common'
import { randomBytes } from 'crypto'
import slugify from 'slugify'

import { PrismaService } from '@/prisma/prisma.service'
import { CategoriesService } from '@/categories/categories.service'
import { AdSource, AdStatus, DealerFeed, DealerFeedStatus, Prisma } from '@/generated/prisma/client'

import { DealerFeedParserService } from '../parser/dealer-feed-parser.service'
import { ValidatedFeedOffer, FeedOfferError } from '../parser/dealer-feed-parser.types'
import { DealerFeedGeocodingService } from '../geocoding/dealer-feed-geocoding.service'
import { DealerFeedPhotosService } from '../photos/dealer-feed-photos.service'
import { DEALER_TIER_LIMITS, SYNC_ERROR_SAMPLE_SIZE } from '../constants/dealer-feeds.constants'

const AD_EXPIRATION_DAYS = 30

// Реальная синхронизация ОДНОГО одобренного фида — вызывается
// DealerFeedSyncWorker по расписанию (см. там) и вручную по кнопке
// "Обновить сейчас" из личного кабинета дилера. Делает то, что
// DealerFeedParserService намеренно НЕ делает при простом разборе
// (см. комментарий там): геокодирует адрес каждой позиции и
// скачивает/перезаливает фото — и уже реально создаёт/обновляет/архивирует
// объявления.
@Injectable()
export class DealerFeedSyncService {
  private readonly logger = new Logger(DealerFeedSyncService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly parser: DealerFeedParserService,
    private readonly geocoding: DealerFeedGeocodingService,
    private readonly photos: DealerFeedPhotosService,
    private readonly categoriesService: CategoriesService
  ) {}

  async syncOne(feed: DealerFeed): Promise<void> {
    if (feed.status !== DealerFeedStatus.APPROVED) {
      this.logger.debug(`Фид ${feed.id} пропущен: не одобрен (status=${feed.status})`)
      return
    }

    if (feed.isPaused) {
      this.logger.debug(`Фид ${feed.id} пропущен: приостановлен дилером`)
      return
    }

    // Массовый импорт доступен только по действующему платному тарифу
    // (см. DealerSubscription/обсуждение с владельцем — та же логика, что
    // и у платной "Авито Автозагрузка") — одобрение фида само по себе
    // прав на синхронизацию не даёт.
    if (!feed.subscriptionTier || !feed.subscriptionUntil || feed.subscriptionUntil < new Date()) {
      this.logger.debug(`Фид ${feed.id} пропущен: нет действующего тарифа`)
      return
    }

    const result = await this.parser.fetchAndParse(feed.url)

    if (result.globalError) {
      await this.prisma.dealerFeed.update({
        where: { id: feed.id },
        data: {
          lastSyncAt: new Date(),
          lastSyncError: result.globalError,
          lastSyncItemsTotal: 0,
          lastSyncItemsCreated: 0,
          lastSyncItemsUpdated: 0,
          lastSyncItemsRemoved: 0,
          lastSyncItemsFailed: 0,
          lastSyncItemErrors: []
        }
      })
      return
    }

    const limit = DEALER_TIER_LIMITS[feed.subscriptionTier]
    const errors: FeedOfferError[] = [...result.errors]
    let offersToProcess = result.valid

    if (limit !== null && result.valid.length > limit) {
      offersToProcess = result.valid.slice(0, limit)
      const dropped = result.valid.slice(limit)
      for (const offer of dropped) {
        errors.push({
          offerId: offer.externalId,
          offerIndex: -1,
          offerTitle: offer.title,
          reason: `Пропущено — превышен лимит текущего тарифа (${limit} позиций)`
        })
      }
    }

    const existingAds = await this.prisma.ad.findMany({
      where: { dealerFeedId: feed.id },
      select: { id: true, externalId: true, images: true, feedSourceImages: true, status: true }
    })
    const existingByExternalId = new Map(existingAds.map(ad => [ad.externalId as string, ad]))

    let created = 0
    let updated = 0
    // Позиции, успешно распознанные парсером (offer.externalId уже есть в
    // seenExternalIds ниже независимо от исхода), но не создавшие/не
    // обновившие объявление на этом шаге (геокодирование не удалось,
    // непредвиденная ошибка) — попадают в errors, а не в отдельный
    // счётчик, чтобы lastSyncItemsFailed всегда равнялся errors.length
    // (единый источник правды, без риска рассинхронизации двух счётчиков).
    for (const offer of offersToProcess) {
      const existing = existingByExternalId.get(offer.externalId)

      try {
        const failureReason = await this.upsertOffer(feed.id, offer, existing ?? null)

        if (failureReason) {
          errors.push({ offerId: offer.externalId, offerIndex: -1, offerTitle: offer.title, reason: failureReason })
        } else if (existing) {
          updated++
        } else {
          created++
        }
      } catch (error) {
        errors.push({
          offerId: offer.externalId,
          offerIndex: -1,
          offerTitle: offer.title,
          reason: `Внутренняя ошибка при обработке позиции: ${(error as Error).message}`
        })
        this.logger.error(`Ошибка синхронизации позиции ${offer.externalId} фида ${feed.id}`, error as Error)
      }
    }

    // Позиции, которые пропали из фида целиком (не встретились ни среди
    // валидных, ни среди ошибочных ЭТОГО прогона) — снимаем с публикации.
    // Позиции, которые остались в фиде, но сейчас не проходят валидацию,
    // НЕ трогаем — оставляем как есть, чтобы временная ошибка в одной
    // позиции не гасила уже опубликованное объявление (см. обсуждение).
    const seenExternalIds = new Set<string>([
      ...offersToProcess.map(o => o.externalId),
      ...errors.map(e => e.offerId).filter((id): id is string => id !== null)
    ])

    let removed = 0
    for (const existing of existingAds) {
      if (existing.externalId && !seenExternalIds.has(existing.externalId) && existing.status !== AdStatus.ARCHIVED) {
        await this.prisma.ad.update({
          where: { id: existing.id },
          data: { status: AdStatus.ARCHIVED, archivedAt: new Date() }
        })
        removed++
      }
    }

    await this.prisma.dealerFeed.update({
      where: { id: feed.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncError: null,
        lastSyncItemsTotal: offersToProcess.length + result.errors.length,
        lastSyncItemsCreated: created,
        lastSyncItemsUpdated: updated,
        lastSyncItemsRemoved: removed,
        lastSyncItemsFailed: errors.length,
        lastSyncItemErrors: errors.slice(0, SYNC_ERROR_SAMPLE_SIZE) as unknown as Prisma.InputJsonValue
      }
    })

    this.logger.log(
      `Синхронизация фида ${feed.id} завершена: создано ${created}, обновлено ${updated}, снято с публикации ${removed}, ошибок ${errors.length}`
    )
  }

  // Возвращает null при успехе, иначе — человекочитаемую причину отказа
  // (попадает в DealerFeed.lastSyncItemErrors, см. вызывающий код).
  private async upsertOffer(
    feedId: string,
    offer: ValidatedFeedOffer,
    existing: { id: string; images: string[]; feedSourceImages: Prisma.JsonValue } | null
  ): Promise<string | null> {
    const geocoded = await this.geocoding.geocode(offer.address)

    if (!geocoded) {
      return `Не удалось определить координаты адреса "${offer.address}"`
    }

    const previousSourceMap = (existing?.feedSourceImages as Record<string, string> | null) ?? null
    const imageSync = await this.photos.syncImages(offer.pictures, previousSourceMap)
    await this.photos.deleteOrphaned(previousSourceMap, imageSync.sourceMap)

    const categoryPath = await this.categoriesService.getCategoryPath(offer.categoryId)

    const baseData = {
      title: offer.title,
      description: offer.description,
      price: BigInt(Math.round(offer.price)),
      categoryId: offer.categoryId,
      categoryPath,
      address: geocoded.address,
      lat: geocoded.lat,
      lng: geocoded.lng,
      region: geocoded.region,
      regionIsoCode: geocoded.regionIsoCode,
      locality: geocoded.locality,
      localityFiasId: geocoded.localityFiasId,
      phone: offer.phone,
      images: imageSync.images,
      features: offer.features as Prisma.InputJsonValue,
      feedSourceImages: imageSync.sourceMap as unknown as Prisma.InputJsonValue,
      feedRawData: offer.raw as unknown as Prisma.InputJsonValue
    }

    if (existing) {
      // Статус объявления сознательно не трогаем при обновлении — если
      // админ вручную отклонил/архивировал конкретное объявление из фида
      // отдельно (обычной модерацией), повторная синхронизация не должна
      // молча вернуть его в публикацию поверх решения админа.
      await this.prisma.ad.update({
        where: { id: existing.id },
        data: baseData
      })
      return null
    }

    const baseSlug = slugify(offer.title, { lower: true, strict: true, locale: 'ru' }) || 'ad'
    const slug = `${baseSlug}-${randomBytes(3).toString('hex')}`
    const seoPath = this.categoriesService.buildSeoPath(categoryPath, slug)

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + AD_EXPIRATION_DAYS)

    await this.prisma.ad.create({
      data: {
        ...baseData,
        userId: (await this.getFeedOwnerId(feedId))!,
        source: AdSource.FEED,
        dealerFeedId: feedId,
        externalId: offer.externalId,
        slug,
        seoPath,
        // Одобренный фид уже прошёл ручную модерацию как источник (см.
        // обсуждение) — отдельные позиции публикуются сразу, без очереди
        // модерации на каждую (иначе смысл автоматизации теряется).
        status: AdStatus.PUBLISHED,
        publishedAt: now,
        expiresAt
      }
    })
    return null
  }

  private async getFeedOwnerId(feedId: string): Promise<string | null> {
    const feed = await this.prisma.dealerFeed.findUnique({ where: { id: feedId }, select: { userId: true } })
    return feed?.userId ?? null
  }
}
