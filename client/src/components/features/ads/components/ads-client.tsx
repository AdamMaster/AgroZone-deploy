'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

import { findCategoryIdBySlug } from '@/components/features/categories/utils/category-utils'

import { useCategories } from '../../categories/hooks/use-categories'
import { useCatalogFilters } from '../../filter/hooks/use-catalog-filters'
import { useAds } from '../hooks'
import { IAdsListResponse } from '../types/ad.types'
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
  // Первая страница, отрисованная сервером для пустого запроса (см.
  // page.tsx главной). Используем её как initialData для useAds ТОЛЬКО
  // когда реальный запрос клиента гарантированно совпадает с тем, что
  // получил сервер (см. canUseInitialAds ниже) — иначе, например,
  // подставленный из localStorage домашний регион пользователя (которого
  // сервер на первом запросе не знает) на миг покажет неотфильтрованную
  // ленту вместо региональной.
  initialAds?: IAdsListResponse
}

export function AdsClient({ serverSlug, layout, className, locationOverride, initialAds }: AdsClientProps) {
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

  // initialAds сервер посчитал для ПУСТОГО запроса (без категории, поиска,
  // региона и прочих фильтров) — используем его как initialData, только
  // если клиент прямо сейчас запрашивает то же самое. Как только
  // появляется categoryId (страница категории через AdsClient),
  // поисковый запрос, домашний регион пользователя из localStorage или
  // активные фильтры каталога — initialAds сервера этому запросу уже не
  // соответствует, и useAds должен уйти в обычный клиентский фетч.
  const canUseInitialAds = Boolean(
    initialAds && !categoryId && !searchQuery && !hasLocationOverride && !filters.hasActiveFilters
  )

  const { ads, isLoadingAds } = useAds(
    buildAdsQueryParams({ categoryId, search: searchQuery, filters, locationOverride }),
    canUseInitialAds ? initialAds : undefined
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
