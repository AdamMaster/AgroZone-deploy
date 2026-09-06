import { CatalogFiltersState, FeatureFilterValue, FeatureFiltersMap } from '../types/filter.types'

// Вынесено из use-catalog-filters.ts (без изменений в логике парсинга) в
// отдельный файл БЕЗ 'use client' — чтобы серверный компонент страницы
// каталога (page.tsx) мог использовать тот же самый парсинг URL-параметров
// фильтра, что и клиентский хук useCatalogFilters. Из файла с 'use client'
// (каким был use-catalog-filters.ts) серверный компонент импортировать
// обычную функцию не может — весь модуль с этой директивой трактуется
// бандлером как клиентская граница целиком, вызов на сервере упал бы в
// рантайме. Если бы SSR-выдача резолвила фильтры иначе, чем клиент после
// гидратации, — список объявлений на первой отрисовке отличался бы от того,
// что показывает клиент, и это довольно быстро стало бы заметно как "мигание"
// контента.
export const FEATURES_PARAM = 'features'

// Значение считается "пустым" — такое условие только засоряло бы URL и
// не добавляло бы никакого реального ограничения на запрос.
export const isEmptyFeatureValue = (value: FeatureFilterValue): boolean => {
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'boolean') return value === false
  return value.min === undefined && value.max === undefined
}

const parseFeatures = (raw: string | null): FeatureFiltersMap => {
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as FeatureFiltersMap
    }
  } catch {
    // Битый параметр в адресной строке (например, вручную отредактированный
    // URL) — просто игнорируем, а не роняем страницу.
  }

  return {}
}

export const EMPTY_STATE: CatalogFiltersState = {
  sortBy: undefined,
  unit: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  regionIsoCode: undefined,
  localityFiasId: undefined,
  sellerType: undefined,
  features: {}
}

// Принимает URLSearchParams — на клиенте это searchParams из useSearchParams(),
// на сервере в page.tsx строится вручную из пропа searchParams (там это
// плоский объект { [key]: string | string[] | undefined }, а не готовый
// URLSearchParams).
export const parseCatalogFiltersFromSearchParams = (searchParams: URLSearchParams): CatalogFiltersState => ({
  sortBy: searchParams.get('sortBy') ?? undefined,
  unit: searchParams.get('unit') ?? undefined,
  minPrice: searchParams.get('minPrice') ?? undefined,
  maxPrice: searchParams.get('maxPrice') ?? undefined,
  regionIsoCode: searchParams.get('regionIsoCode') ?? undefined,
  localityFiasId: searchParams.get('localityFiasId') ?? undefined,
  sellerType: searchParams.get('sellerType') ?? undefined,
  features: parseFeatures(searchParams.get(FEATURES_PARAM))
})
