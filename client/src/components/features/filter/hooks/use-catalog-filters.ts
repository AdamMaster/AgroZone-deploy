'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'

import { CatalogFiltersState, FeatureFilterValue, FeatureFiltersMap } from '../types/filter.types'

const FEATURES_PARAM = 'features'

// Значение считается "пустым" — такое условие только засоряло бы URL и
// не добавляло бы никакого реального ограничения на запрос.
const isEmptyFeatureValue = (value: FeatureFilterValue): boolean => {
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

const readStateFromParams = (searchParams: URLSearchParams): CatalogFiltersState => ({
  sortBy: searchParams.get('sortBy') ?? undefined,
  unit: searchParams.get('unit') ?? undefined,
  minPrice: searchParams.get('minPrice') ?? undefined,
  maxPrice: searchParams.get('maxPrice') ?? undefined,
  regionIsoCode: searchParams.get('regionIsoCode') ?? undefined,
  localityFiasId: searchParams.get('localityFiasId') ?? undefined,
  sellerType: searchParams.get('sellerType') ?? undefined,
  features: parseFeatures(searchParams.get(FEATURES_PARAM))
})

const writeStateToParams = (state: CatalogFiltersState, base: URLSearchParams): URLSearchParams => {
  const params = new URLSearchParams(base.toString())

  const scalarEntries: [string, string | undefined][] = [
    ['sortBy', state.sortBy],
    ['unit', state.unit],
    ['minPrice', state.minPrice],
    ['maxPrice', state.maxPrice],
    ['regionIsoCode', state.regionIsoCode],
    ['localityFiasId', state.localityFiasId],
    ['sellerType', state.sellerType]
  ]

  for (const [key, value] of scalarEntries) {
    if (value === undefined || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
  }

  if (Object.keys(state.features).length) {
    params.set(FEATURES_PARAM, JSON.stringify(state.features))
  } else {
    params.delete(FEATURES_PARAM)
  }

  return params
}

const EMPTY_STATE: CatalogFiltersState = {
  sortBy: undefined,
  unit: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  regionIsoCode: undefined,
  localityFiasId: undefined,
  sellerType: undefined,
  features: {}
}

type ScalarPatch = Partial<
  Pick<
    CatalogFiltersState,
    'sortBy' | 'unit' | 'minPrice' | 'maxPrice' | 'regionIsoCode' | 'localityFiasId' | 'sellerType'
  >
>

interface UseCatalogFiltersOptions {
  // true (по умолчанию) — каждое изменение сразу летит в URL, как и раньше
  // (десктопный сайдбар, CatalogSort). false — используется мобильным
  // полноэкранным окном фильтра (FilterModal): изменения копятся локально
  // и применяются в URL одним router.push разом, по вызову apply() (кнопка
  // "Показать") — иначе выбор/ввод в любом поле сразу дёргал бы переход и
  // рефетч объявлений, что на мобилке неудобно и нелогично.
  immediate?: boolean
}

// Читает и обновляет параметры фильтра каталога прямо в URL
// (?sortBy=&unit=&minPrice=&maxPrice=&features=), тем же способом, каким
// уже работают ?search= и ?category= в AdsClient/SearchBar — так что
// отфильтрованный каталог остаётся обычной шарабельной ссылкой.
export function useCatalogFilters(options: UseCatalogFiltersOptions = {}) {
  const { immediate = true } = options

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlState = useMemo(() => readStateFromParams(searchParams), [searchParams])

  // Буфер несохранённых изменений — актуален только при immediate: false.
  // Держим его в ref, а не в useState: apply() может вызываться сразу же
  // вслед за update() в том же тике (см. FilterModal — снятие фокуса с
  // поля цены перед применением), а обновления useState применяются не
  // мгновенно, а только на следующем рендере — apply() прочитал бы ещё
  // старое значение. Ref читается синхронно сразу после записи, поэтому
  // такой гонки нет. forceRerender нужен отдельно — только чтобы
  // управляемые инпуты в дереве Filter увидели новое значение до apply().
  const draftRef = useRef<CatalogFiltersState>(urlState)
  const pendingCategoryRef = useRef<string | undefined>(undefined)
  const [, forceRerender] = useReducer((tick: number) => tick + 1, 0)

  useEffect(() => {
    draftRef.current = urlState
    pendingCategoryRef.current = undefined
    forceRerender()
  }, [urlState])

  const state = immediate ? urlState : draftRef.current

  const push = useCallback(
    (params: URLSearchParams) => {
      // Смена любого фильтра — это фактически новый поиск, начинаем с
      // первой страницы.
      params.delete('page')
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname]
  )

  const update = useCallback(
    (patch: ScalarPatch) => {
      if (!immediate) {
        draftRef.current = { ...draftRef.current, ...patch }
        forceRerender()
        return
      }

      push(writeStateToParams({ ...urlState, ...patch }, searchParams))
    },
    [immediate, urlState, searchParams, push]
  )

  const setFeatureValue = useCallback(
    (name: string, value: FeatureFilterValue | undefined) => {
      const nextFeatures: FeatureFiltersMap = { ...state.features }

      if (value === undefined || isEmptyFeatureValue(value)) {
        delete nextFeatures[name]
      } else {
        nextFeatures[name] = value
      }

      if (!immediate) {
        draftRef.current = { ...draftRef.current, features: nextFeatures }
        forceRerender()
        return
      }

      push(writeStateToParams({ ...urlState, features: nextFeatures }, searchParams))
    },
    [immediate, state.features, urlState, searchParams, push]
  )

  // Выбор категории в SubcategoryList — не патч query-параметров, а переход
  // на другой путь каталога, поэтому живёт отдельно от update(). В
  // immediate-режиме — обычная навигация сразу же (как и было раньше). В
  // отложенном — только запоминаем путь, реальный переход происходит в
  // apply().
  const selectCategory = useCallback(
    (fullPath: string) => {
      if (!immediate) {
        pendingCategoryRef.current = fullPath
        forceRerender()
        return
      }

      router.push(`/catalog/${fullPath}`)
    },
    [immediate, router]
  )

  const reset = useCallback(() => {
    if (!immediate) {
      draftRef.current = EMPTY_STATE
      pendingCategoryRef.current = undefined
      forceRerender()
      return
    }

    push(writeStateToParams(EMPTY_STATE, searchParams))
  }, [immediate, searchParams, push])

  // Разово переносит накопленный буфер в URL — вызывается кнопкой
  // "Показать" в мобильном окне фильтра. В immediate-режиме не нужна —
  // изменения там и так применяются сразу же. Читает draftRef напрямую
  // (не state/draft из рендера), поэтому корректно подхватывает и
  // изменение, сделанное синхронно прямо перед вызовом (см. FilterModal).
  const apply = useCallback(() => {
    if (immediate) return

    if (pendingCategoryRef.current) {
      // Смена категории — как и раньше в SubcategoryList — начинает с
      // чистого листа: остальные фильтры категорийно-специфичны
      // (features) и не обязаны иметь смысл в другой категории.
      router.push(`/catalog/${pendingCategoryRef.current}`)
      return
    }

    push(writeStateToParams(draftRef.current, searchParams))
  }, [immediate, searchParams, push, router])

  const hasActiveFilters = Boolean(
    state.unit ||
    state.minPrice ||
    state.maxPrice ||
    state.regionIsoCode ||
    state.localityFiasId ||
    state.sellerType ||
    Object.keys(state.features).length
  )

  return { ...state, update, setFeatureValue, selectCategory, apply, reset, hasActiveFilters }
}
