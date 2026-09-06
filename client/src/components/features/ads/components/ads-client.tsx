'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

import { findCategoryIdBySlug } from '@/components/features/categories/utils/category-utils'

import { useCategories } from '../../categories/hooks/use-categories'
import { useCatalogFilters } from '../../filter/hooks/use-catalog-filters'
import { useAds } from '../hooks'
import { buildAdsQueryParams } from '../utils/build-ads-query-params'
import { AdsGrid } from './ads-grid'

interface AdsLocationOverride {
  regionIsoCode?: string
  localityFiasId?: string
}

interface AdsClientProps {
  serverSlug?: string | null
  layout?: string
  className?: 'cols-1' | 'cols-4'
  // Только для главной (см. HomeAdsFeed) — подставляет "домашний" регион
  // пользователя (HomeLocationPicker, localStorage) вместо
  // regionIsoCode/localityFiasId из URL-фильтра каталога. На страницу
  // каталога не влияет — там этот проп никогда не передаётся, и
  // используются только filters.* как раньше.
  locationOverride?: AdsLocationOverride
}

// Без SSR и без пагинации — один запрос первой страницы целиком на клиенте.
// Используется на главной (HomeAdsFeed, лента объявлений с капом в
// CATALOG_PAGE_SIZE без «Показать ещё») и как общий шаблон для случаев, где
// заранее полученных с сервера данных нет. Для страницы каталога — см.
// CatalogAdsGrid (initialData с SSR + useInfiniteQuery + «Показать ещё»,
// S1 в ROADMAP.md).
export function AdsClient({ serverSlug, layout, className, locationOverride }: AdsClientProps) {
  const searchParams = useSearchParams()
  const { categories, isLoadingCategories } = useCategories()
  const filters = useCatalogFilters()
  const searchQuery = searchParams.get('search') ?? undefined
  const slug = serverSlug?.split('/').at(-1) ?? searchParams.get('category') ?? undefined

  const categoryId = useMemo(() => {
    if (!slug) return undefined
    return findCategoryIdBySlug(categories, slug)
  }, [categories, slug])

  const hasLocationOverride = Boolean(
    locationOverride && (locationOverride.regionIsoCode || locationOverride.localityFiasId)
  )

  const { ads, isLoadingAds } = useAds(
    buildAdsQueryParams({ categoryId, search: searchQuery, filters, locationOverride })
  )

  const trimmedSearchQuery = searchQuery?.trim()
  const emptyMessage = hasLocationOverride
    ? 'В этом регионе пока нет объявлений — попробуйте выбрать другой регион или посмотреть всю Россию'
    : trimmedSearchQuery
      ? `По запросу «${trimmedSearchQuery}» ничего не найдено`
      : filters.hasActiveFilters
        ? 'Ничего не найдено — попробуйте изменить фильтры'
        : 'В этой категории пока нет объявлений'

  return (
    <AdsGrid
      ads={ads}
      layout={layout}
      className={className}
      isLoading={isLoadingCategories || isLoadingAds}
      emptyMessage={emptyMessage}
    />
  )
}
