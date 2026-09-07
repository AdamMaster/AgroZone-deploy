import { Injectable, Logger } from '@nestjs/common'
import { XMLParser } from 'fast-xml-parser'

import { PrismaService } from '@/prisma/prisma.service'
import { FeatureType } from '@/generated/prisma/client'
import { normalizePhone } from '@/libs/common/utils/phone.util'

import {
  DEALER_FEED_FETCH_TIMEOUT_MS,
  DEALER_FEED_MAX_FILE_SIZE_BYTES,
  DEALER_FEED_MAX_IMAGES_PER_OFFER,
  DEALER_FEED_MAX_OFFERS_HARD_CAP
} from '../constants/dealer-feeds.constants'
import { DealerFeedParseResult, FeedOfferError, RawFeedOffer, ValidatedFeedOffer } from './dealer-feed-parser.types'

// Разбирает и валидирует XML-фид дилера — см. подробное описание формата
// и обоснование выбора именно этого подмножества YML в
// dealer-feed-parser.types.ts.
//
// Намеренно НЕ делает здесь: геокодирование адреса (см.
// ValidatedFeedOffer.address — остаётся строкой) и скачивание/перезаливку
// фотографий (см. ValidatedFeedOffer.pictures — остаются исходными
// ссылками дилера). Обе операции — сетевые запросы НА КАЖДУЮ позицию, а
// разбор фида используется в том числе для предпросмотра админом перед
// одобрением (см. DealerFeedsService.preview) — прогонять сотни/тысячи
// геокодирований и скачиваний фото ради предпросмотра было бы и медленно,
// и по сути лишней тратой (позиция может быть отклонена админом). Обе
// операции выполняются позже, только для уже одобренных фидов, в момент
// реальной синхронизации (см. DealerFeedSyncService).
@Injectable()
export class DealerFeedParserService {
  private readonly logger = new Logger(DealerFeedParserService.name)

  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
    // Поля, которые должны стать массивом, даже если в фиде всего один
    // элемент (иначе fast-xml-parser отдаёт одиночный объект вместо
    // массива из одного элемента, и код разбора пришлось бы дублировать
    // на "один или много").
    isArray: (name: string) => ['offer', 'picture', 'param'].includes(name)
  })

  constructor(private readonly prisma: PrismaService) {}

  // Скачивает фид по ссылке и полностью разбирает + валидирует его.
  // Ошибки самого фида (недоступен, невалидный XML, пустой) идут в
  // globalError; ошибки ОТДЕЛЬНЫХ позиций — в errors, не блокируя
  // остальные валидные позиции (одна битая позиция не должна ронять весь
  // импорт сотни остальных).
  async fetchAndParse(feedUrl: string): Promise<DealerFeedParseResult> {
    let xml: string

    try {
      xml = await this.download(feedUrl)
    } catch (error) {
      return {
        globalError: error instanceof Error ? error.message : 'Не удалось скачать фид',
        valid: [],
        errors: []
      }
    }

    let raw: RawFeedOffer[]

    try {
      raw = this.parseXml(xml)
    } catch (error) {
      this.logger.warn(`Не удалось разобрать XML фида ${feedUrl}: ${(error as Error).message}`)
      return {
        globalError: 'Файл фида не является валидным XML в ожидаемом формате',
        valid: [],
        errors: []
      }
    }

    if (raw.length === 0) {
      return { globalError: 'В фиде не найдено ни одной позиции (тег <offer>)', valid: [], errors: [] }
    }

    if (raw.length > DEALER_FEED_MAX_OFFERS_HARD_CAP) {
      return {
        globalError: `В фиде ${raw.length} позиций — это больше допустимого предела в ${DEALER_FEED_MAX_OFFERS_HARD_CAP}`,
        valid: [],
        errors: []
      }
    }

    return this.validateOffers(raw)
  }

  private async download(feedUrl: string): Promise<string> {
    let parsedUrl: URL

    try {
      parsedUrl = new URL(feedUrl)
    } catch {
      throw new Error('Некорректная ссылка на фид')
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('Ссылка на фид должна быть по протоколу http(s)')
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEALER_FEED_FETCH_TIMEOUT_MS)

    let response: Response

    try {
      response = await fetch(parsedUrl, { signal: controller.signal })
    } catch {
      throw new Error('Не удалось подключиться по ссылке на фид (сервер не отвечает или недоступен)')
    } finally {
      clearTimeout(timeout)
    }

    if (!response.ok) {
      throw new Error(`Сервер дилера вернул ошибку ${response.status} при запросе фида`)
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength && Number(contentLength) > DEALER_FEED_MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `Файл фида слишком большой (${Math.round(Number(contentLength) / 1024 / 1024)} МБ, максимум ${DEALER_FEED_MAX_FILE_SIZE_BYTES / 1024 / 1024} МБ)`
      )
    }

    const text = await response.text()

    if (Buffer.byteLength(text, 'utf-8') > DEALER_FEED_MAX_FILE_SIZE_BYTES) {
      throw new Error(`Файл фида слишком большой, максимум ${DEALER_FEED_MAX_FILE_SIZE_BYTES / 1024 / 1024} МБ`)
    }

    return text
  }

  private parseXml(xml: string): RawFeedOffer[] {
    const parsed = this.xmlParser.parse(xml)

    const offersNode = parsed?.offers?.offer

    if (!offersNode) {
      return []
    }

    const offerList: unknown[] = Array.isArray(offersNode) ? offersNode : [offersNode]

    return offerList.map(offer => this.normalizeOffer(offer))
  }

  private normalizeOffer(offer: unknown): RawFeedOffer {
    const node = (offer ?? {}) as Record<string, unknown>

    const idAttr = node['@_id']
    const id = typeof idAttr === 'string' ? idAttr.trim() : typeof idAttr === 'number' ? String(idAttr) : null

    const picturesNode = (node.pictures as Record<string, unknown> | undefined)?.picture
    const pictures = Array.isArray(picturesNode)
      ? picturesNode.map(p => (typeof p === 'string' ? p.trim() : String(p))).filter(Boolean)
      : []

    const paramsNode = (node.params as Record<string, unknown> | undefined)?.param
    const paramList: unknown[] = Array.isArray(paramsNode) ? paramsNode : []
    const params: Record<string, string> = {}

    for (const paramNode of paramList) {
      const p = (paramNode ?? {}) as Record<string, unknown>
      const name = p['@_name']
      // fast-xml-parser кладёт текстовое содержимое тега с атрибутами в
      // '#text', если у тега есть хотя бы один атрибут (см. настройку
      // attributeNamePrefix выше).
      const value = p['#text']

      if (
        typeof name === 'string' &&
        name.trim() &&
        (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
      ) {
        params[name.trim()] = String(value).trim()
      }
    }

    return {
      id,
      name: this.textOrNull(node.name),
      description: this.textOrNull(node.description),
      price: this.textOrNull(node.price),
      categoryCode: this.textOrNull(node.categoryCode),
      address: this.textOrNull(node.address),
      phone: this.textOrNull(node.phone),
      pictures,
      params
    }
  }

  private textOrNull(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') return null
    const str = String(value).trim()
    return str.length > 0 ? str : null
  }

  private async validateOffers(rawOffers: RawFeedOffer[]): Promise<DealerFeedParseResult> {
    const errors: FeedOfferError[] = []
    const valid: ValidatedFeedOffer[] = []
    const seenIds = new Set<string>()

    // Категории запрашиваем по мере встречи кода, а не пачкой заранее —
    // фидов с одной-двумя повторяющимися категориями на сотни позиций
    // подавляющее большинство, кешируем в рамках одного вызова.
    const categoryCache = new Map<string, Awaited<ReturnType<typeof this.resolveCategory>>>()

    for (let index = 0; index < rawOffers.length; index++) {
      const offer = rawOffers[index]
      const title = offer.name

      const fail = (reason: string) => {
        errors.push({ offerId: offer.id, offerIndex: index, offerTitle: title, reason })
      }

      if (!offer.id) {
        fail('Отсутствует обязательный атрибут id у позиции')
        continue
      }

      if (seenIds.has(offer.id)) {
        fail(`Повторяющийся id "${offer.id}" — в фиде уже была позиция с таким же id`)
        continue
      }
      seenIds.add(offer.id)

      if (!offer.name) {
        fail('Отсутствует обязательное поле name (название)')
        continue
      }

      if (!offer.description) {
        fail('Отсутствует обязательное поле description (описание)')
        continue
      }

      const price = offer.price ? Number(offer.price.replace(/[^\d.]/g, '')) : NaN
      if (!offer.price || !Number.isFinite(price) || price <= 0) {
        fail('Поле price отсутствует или не является положительным числом')
        continue
      }

      if (!offer.categoryCode) {
        fail('Отсутствует обязательное поле categoryCode')
        continue
      }

      if (!categoryCache.has(offer.categoryCode)) {
        categoryCache.set(offer.categoryCode, await this.resolveCategory(offer.categoryCode))
      }
      const category = categoryCache.get(offer.categoryCode)!

      if (!category) {
        fail(`Код категории "${offer.categoryCode}" не найден — см. точные коды в GET /categories`)
        continue
      }

      if (!offer.address) {
        fail('Отсутствует обязательное поле address')
        continue
      }

      if (!offer.phone) {
        fail('Отсутствует обязательное поле phone')
        continue
      }

      let normalizedPhone: string
      try {
        normalizedPhone = normalizePhone(offer.phone)
      } catch {
        fail(`Некорректный номер телефона "${offer.phone}"`)
        continue
      }

      const pictures = offer.pictures
        .filter(url => this.isValidPictureUrl(url))
        .slice(0, DEALER_FEED_MAX_IMAGES_PER_OFFER)

      const featureResult = this.matchFeatures(category.categoryFeatures, offer.params)
      if (featureResult.error) {
        fail(featureResult.error)
        continue
      }

      valid.push({
        externalId: offer.id,
        title: offer.name,
        description: offer.description,
        price,
        categoryId: category.id,
        address: offer.address,
        phone: normalizedPhone,
        pictures,
        features: featureResult.features,
        raw: offer
      })
    }

    return { globalError: null, valid, errors }
  }

  private async resolveCategory(code: string) {
    return this.prisma.category.findUnique({
      where: { code },
      select: {
        id: true,
        categoryFeatures: {
          select: { name: true, label: true, type: true, required: true, options: true }
        }
      }
    })
  }

  private isValidPictureUrl(url: string): boolean {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
      return false
    }
  }

  // Сопоставляет <param name="..."> из фида с динамическими полями
  // категории (CategoryFeature, см. схему) по названию/лейблу без учёта
  // регистра. Если у категории есть ОБЯЗАТЕЛЬНОЕ поле, которому не
  // нашлось соответствия среди присланных params (по имени) — позиция
  // целиком не проходит валидацию (см. обсуждение: фид не может
  // "угадать" наши произвольные поля категории, поэтому дилер должен
  // явно прислать их под тем же именем, что видно в GET
  // /categories/:id/features).
  private matchFeatures(
    categoryFeatures: { name: string; label: string; type: FeatureType; required: boolean; options: unknown }[],
    params: Record<string, string>
  ): { features: Record<string, unknown>; error: string | null } {
    const normalizedParams = new Map<string, string>()
    for (const [key, value] of Object.entries(params)) {
      normalizedParams.set(key.trim().toLowerCase(), value)
    }

    const features: Record<string, unknown> = {}

    for (const feature of categoryFeatures) {
      const rawValue =
        normalizedParams.get(feature.name.trim().toLowerCase()) ??
        normalizedParams.get(feature.label.trim().toLowerCase())

      if (rawValue === undefined) {
        if (feature.required) {
          return {
            features,
            error: `Не удалось сопоставить обязательное поле категории «${feature.label}» (ожидается <param name="${feature.name}"> или "${feature.label}")`
          }
        }
        continue
      }

      const converted = this.convertFeatureValue(rawValue, feature.type, feature.options)

      if (converted === undefined) {
        if (feature.required) {
          return {
            features,
            error: `Значение "${rawValue}" поля «${feature.label}» не удалось привести к нужному типу`
          }
        }
        continue
      }

      features[feature.name] = converted
    }

    return { features, error: null }
  }

  private convertFeatureValue(rawValue: string, type: FeatureType, options: unknown): unknown {
    const trimmed = rawValue.trim()

    switch (type) {
      case FeatureType.TEXT:
        return trimmed

      case FeatureType.NUMBER: {
        const match = trimmed.replace(',', '.').match(/-?\d+(\.\d+)?/)
        return match ? Number(match[0]) : undefined
      }

      case FeatureType.BOOLEAN: {
        const normalized = trimmed.toLowerCase()
        if (['да', 'yes', 'true', '1'].includes(normalized)) return true
        if (['нет', 'no', 'false', '0'].includes(normalized)) return false
        return undefined
      }

      case FeatureType.SELECT: {
        const list = Array.isArray(options) ? (options as string[]) : []
        const match = list.find(opt => opt.trim().toLowerCase() === trimmed.toLowerCase())
        return match ?? undefined
      }

      default:
        return trimmed
    }
  }
}
