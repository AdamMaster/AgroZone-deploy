import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RedisService } from '@/redis/redis.service'

const ADDRESS_NOT_FOUND = 'Адрес не найден'
const REQUEST_TIMEOUT_MS = 5000
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60

// Обратный геокодинг через Яндекс (платный API с ключом). Результат
// кэшируется в Redis: координаты округляются до 4 знаков (~11 м), так что
// повторные запросы с той же точки (и с близких, и от разных пользователей)
// не тратят квоту и деньги. Сбой кэша не мешает работе — тогда просто
// идём в Яндекс.
@Injectable()
export class GeocodeService {
  private readonly logger = new Logger(GeocodeService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService
  ) {}

  async getAddressFromCoords(lat: number, lon: number): Promise<string> {
    const cacheKey = `geocode:${lat.toFixed(4)},${lon.toFixed(4)}`

    const cached = await this.readCache(cacheKey)
    if (cached) return cached

    const address = await this.fetchAddress(lat, lon)

    // «Не найден» не кэшируем — это может быть временный сбой на стороне Яндекса.
    if (address !== ADDRESS_NOT_FOUND) {
      await this.writeCache(cacheKey, address)
    }

    return address
  }

  private async fetchAddress(lat: number, lon: number): Promise<string> {
    const params = new URLSearchParams({
      apikey: this.configService.getOrThrow<string>('YANDEX_MAPS_API_KEY'),
      geocode: `${lon},${lat}`,
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

    const text =
      data?.response?.GeoObjectCollection?.featureMember?.[0]?.GeoObject?.metaDataProperty?.GeocoderMetaData?.text

    return typeof text === 'string' && text ? text : ADDRESS_NOT_FOUND
  }

  private async readCache(key: string): Promise<string | null> {
    try {
      const raw = await this.redis.get(key)
      return raw ? (JSON.parse(raw) as string) : null
    } catch {
      return null
    }
  }

  private async writeCache(key: string, address: string): Promise<void> {
    try {
      await this.redis.set(key, address, CACHE_TTL_SECONDS)
    } catch {
      // кэш — оптимизация, не критично
    }
  }
}
