import { CatalogFiltersState } from '../../filter/types/filter.types'

// Сколько объявлений просим за один запрос списка каталога — и на
// SSR-запросе первой страницы (см. page.tsx), и при каждом клике «Показать
// ещё» на клиенте (см. useAdsInfinite). Общая константа, а не просто "20"
// в двух местах — чтобы getNextPageParam мог надёжно посчитать, есть ли
// ещё страницы (page * limit < total), даже если это число когда-нибудь
// поменяют.
export const CATALOG_PAGE_SIZE = 20

interface BuildAdsQueryParamsInput {
  categoryId?: string
  search?: string
  filters: Pick<
    CatalogFiltersState,
    | 'sortBy'
    | 'unit'
    | 'minPrice'
    | 'maxPrice'
    | 'regionIsoCode'
    | 'localityFiasId'
    | 'sellerType'
    | 'lat'
    | 'lng'
    | 'radiusKm'
    | 'features'
  >
  // Только для главной (см. HomeAdsFeed/AdsClient.locationOverride) —
  // подставляет регион/город вместо filters.regionIsoCode/localityFiasId.
  // На каталог не влияет — там всегда undefined.
  locationOverride?: { regionIsoCode?: string; localityFiasId?: string }
}

// Собирает объект параметров запроса GET /ads — общий и для клиентского
// useAds/useAdsInfinite, и для серверного SSR-фетча первой страницы
// каталога (page.tsx), чтобы оба места формировали ОДИНАКОВЫЙ запрос по
// одинаковым входным данным (иначе первая, серверно отрисованная страница
// могла бы отличаться от того, что клиент запросит сам при следующей
// странице/смене фильтра).
export function buildAdsQueryParams({
  categoryId,
  search,
  filters,
  locationOverride
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}: BuildAdsQueryParamsInput): Record<string, any> {
  const regionIsoCode = locationOverride ? locationOverride.regionIsoCode : filters.regionIsoCode
  const localityFiasId = locationOverride ? locationOverride.localityFiasId : filters.localityFiasId

  return {
    categoryId,
    search,
    sortBy: filters.sortBy,
    unit: filters.unit,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    regionIsoCode,
    localityFiasId,
    sellerType: filters.sellerType,
    // lat/lng/radiusKm — как есть на бэкенд (см. FindAdsQueryDto). НЕ
    // передаём тут originLabel — это чисто фронтовая подпись для чипа/поля
    // ввода (см. CatalogFiltersState), на бэкенде такого параметра нет, а
    // ValidationPipe там с forbidNonWhitelisted: true — лишнее поле в
    // query завалило бы запрос целиком 400-й, а не просто игнорировалось.
    lat: filters.lat,
    lng: filters.lng,
    radiusKm: filters.radiusKm,
    features: Object.keys(filters.features).length ? JSON.stringify(filters.features) : undefined
  }
}
