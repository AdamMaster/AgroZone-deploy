import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

// Серверное (прямое) геокодирование адреса дилера из фида — тот же DaData
// suggest-эндпоинт, что и UserService.verifyBusiness (см. там же формат
// авторизации), но /suggest/address вместо /suggest/party. У обычных
// объявлений это делает клиент через react-dadata (см.
// client/src/components/ui/addres-input.tsx) — тут клиента нет вообще
// (адрес приходит строкой из XML дилера), поэтому нужен собственный
// серверный вызов. Извлекаем РОВНО те же поля, что и AddressInput на
// фронте, тем же способом (см. её handleAddressChange) — чтобы
// Ad.region/regionIsoCode/locality/localityFiasId у объявлений из фида
// были устроены идентично обычным, без каких-либо особых случаев в
// фильтрах каталога.
export interface GeocodedAddress {
  address: string
  lat: number
  lng: number
  region: string | null
  regionIsoCode: string | null
  locality: string | null
  localityFiasId: string | null
}

interface DaDataAddressSuggestion {
  value: string
  data: {
    geo_lat: string | null
    geo_lon: string | null
    region_with_type: string | null
    region_iso_code: string | null
    city_with_type: string | null
    city_fias_id: string | null
    settlement_with_type: string | null
    settlement_fias_id: string | null
  }
}

@Injectable()
export class DealerFeedGeocodingService {
  private readonly logger = new Logger(DealerFeedGeocodingService.name)

  constructor(private readonly configService: ConfigService) {}

  // null — адрес не удалось распознать (не бросаем исключение: вызывающий
  // код — DealerFeedSyncService — должен уметь пропустить одну позицию с
  // плохим адресом, не роняя синхронизацию остальных).
  async geocode(rawAddress: string): Promise<GeocodedAddress | null> {
    const dadataKey = this.configService.getOrThrow<string>('DADATA_KEY')

    let response: Response

    try {
      response = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Token ${dadataKey}`
        },
        body: JSON.stringify({ query: rawAddress, count: 1 })
      })
    } catch (error) {
      this.logger.warn(`DaData недоступна при геокодировании "${rawAddress}": ${(error as Error).message}`)
      return null
    }

    if (!response.ok) {
      this.logger.warn(`DaData вернула ${response.status} при геокодировании "${rawAddress}"`)
      return null
    }

    const body = (await response.json()) as { suggestions: DaDataAddressSuggestion[] }
    const suggestion = body.suggestions?.[0]

    if (!suggestion?.data.geo_lat || !suggestion.data.geo_lon) {
      return null
    }

    const locality = suggestion.data.city_with_type ?? suggestion.data.settlement_with_type ?? null
    const localityFiasId = suggestion.data.city_fias_id ?? suggestion.data.settlement_fias_id ?? null

    return {
      address: suggestion.value,
      lat: parseFloat(suggestion.data.geo_lat),
      lng: parseFloat(suggestion.data.geo_lon),
      region: suggestion.data.region_with_type ?? null,
      regionIsoCode: suggestion.data.region_iso_code ?? null,
      locality,
      localityFiasId
    }
  }
}
