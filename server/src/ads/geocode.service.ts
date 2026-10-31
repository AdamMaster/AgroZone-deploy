import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHash } from 'node:crypto'

import { RedisService } from '@/redis/redis.service'

import { hasCoordinates } from './utils/has-coordinates.util'

const ADDRESS_NOT_FOUND = 'Адрес не найден'
const REQUEST_TIMEOUT_MS = 5000
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60

// Слишком грубый результат («Россия»): центр страны вместо адреса объявления
// только вводил бы в заблуждение. Область («Кировская обл») принимаем — так
// указывают адрес продавцы оптовой продукции, и центр области лучше, чем «нет
// точки», раз продавец сам не уточнил место.
const COARSE_KINDS: ReadonlySet<string> = new Set(['country'])

export interface GeoPoint {
  lat: number
  lng: number
}

// Геокодинг через Яндекс (платный API с ключом): обратный (координаты →
// адрес) и прямой (адрес → координаты). Результат кэшируется в Redis: у
// обратного координаты округляются до 4 знаков (~11 м), у прямого ключ — адрес
// без регистра и лишних пробелов, так что повторные запросы (в том числе от
// разных пользователей) не тратят квоту и деньги. Сбой кэша не мешает работе —
// тогда просто идём в Яндекс.
@Injectable()
export class GeocodeService {
  private readonly logger = new Logger(GeocodeService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService
  ) {}

  async getAddressFromCoords(lat: number, lon: number): Promise<string> {
    const cacheKey = `geocode:${lat.toFixed(4)},${lon.toFixed(4)}`

    const cached = await this.readCache<string>(cacheKey)
    if (cached) return cached

    const address = await this.fetchAddress(lat, lon)

    // «Не найден» не кэшируем — это может быть временный сбой на стороне Яндекса.
    if (address !== ADDRESS_NOT_FOUND) {
      await this.writeCache(cacheKey, address)
    }

    return address
  }

  // Адрес → координаты. null — адрес не найден или найден слишком грубо; сбой
  // самого сервиса — 503 (см. requestGeoObject), чтобы не путать «адреса нет» с
  // «геокодер не отвечает».
  async getCoordsFromAddress(address: string): Promise<GeoPoint | null> {
    const normalized = address.trim().replace(/\s+/g, ' ')

    if (!normalized) return null

    const cacheKey = `geocode:address:${createHash('sha1').update(normalized.toLowerCase()).digest('hex')}`

    const cached = await this.readCache<GeoPoint>(cacheKey)
    if (cached) return cached

    const geoObject = await this.requestGeoObject(normalized)
    const point = this.parsePoint(geoObject)

    // Как и «адрес не найден» выше, «не найдено» не кэшируем.
    if (point) await this.writeCache(cacheKey, point)

    return point
  }

  private async fetchAddress(lat: number, lon: number): Promise<string> {
    const geoObject = await this.requestGeoObject(`${lon},${lat}`)
    const text = geoObject?.metaDataProperty?.GeocoderMetaData?.text

    return typeof text === 'string' && text ? text : ADDRESS_NOT_FOUND
  }

  // «lon,lat» Яндекс в ответе отдаёт строкой «долгота широта».
  private parsePoint(geoObject: any): GeoPoint | null {
    const kind = geoObject?.metaDataProperty?.GeocoderMetaData?.kind
    const pos = geoObject?.Point?.pos

    if (typeof pos !== 'string' || COARSE_KINDS.has(kind)) return null

    const [lng, lat] = pos.split(' ').map(Number)

    return hasCoordinates(lat, lng) ? { lat, lng } : null
  }

  // Первый найденный объект геокодера или undefined, если ничего не найдено.
  private async requestGeoObject(geocode: string): Promise<any> {
    const apiKey = this.configService.get<string>('YANDEX_MAPS_API_KEY')

    // Без ключа раньше getOrThrow кидал голую ошибку -> 500 без объяснений.
    // Теперь причина видна в логе, а клиент получает понятный 503 (фильтр
    // радиуса при этом продолжает работать по координатам, см. RadiusFilter).
    if (!apiKey) {
      this.logger.error('Не задан YANDEX_MAPS_API_KEY — геокодер адресов не работает')
      throw new ServiceUnavailableException('Сервис определения адреса временно недоступен')
    }

    const params = new URLSearchParams({
      apikey: apiKey,
      geocode,
      format: 'json',
      results: '1'
    })

    let data: any

    try {
      const response = await fetch(`https://geocode-maps.yandex.ru/1.x/?${params.toString()}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })

      if (!response.ok) {
        // URL с ключом в лог не пишем — только статус.
        this.logger.warn(`Геокодер Яндекса ответил ${response.status}`)
        throw new ServiceUnavailableException('Сервис определения адреса временно недоступен')
      }

      data = await response.json()
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error

      this.logger.warn(`Геокодер Яндекса недоступен: ${(error as Error).name}`)
      throw new ServiceUnavailableException('Сервис определения адреса временно недоступен')
    }

    return data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject
  }

  private async readCache<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  }

  private async writeCache(key: string, value: string | GeoPoint): Promise<void> {
    try {
      await this.redis.set(key, value, CACHE_TTL_SECONDS)
    } catch {
      // кэш — оптимизация, не критично
    }
  }
}
