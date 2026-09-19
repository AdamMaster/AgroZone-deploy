'use client'

import { Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

import { findCategoryIdBySlug } from '@/components/features/categories/utils/category-utils'

import { useInfiniteScrollTrigger } from '@/shared/hooks'

import { useCategories } from '../../categories/hooks/use-categories'
import { useCatalogFilters } from '../../filter/hooks/use-catalog-filters'
import { useAdsInfinite } from '../hooks'
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
  // page.tsx главной). Используем её как initialFirstPage для
  // useAdsInfinite ТОЛЬКО когда реальный запрос клиента гарантированно
  // совпадает с тем, что получил сервер (см. canUseInitialAds ниже) — иначе, например,
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
  // соответствует, и useAdsInfinite должен уйти в обычный клиентский
  // фетч первой страницы.
  const canUseInitialAds = Boolean(
    initialAds && !categoryId && !searchQuery && !hasLocationOverride && !filters.hasActiveFilters
  )

  const { ads, isLoadingAds, hasNextPage, isFetchingNextPage, fetchNextPage } = useAdsInfinite(
    buildAdsQueryParams({ categoryId, search: searchQuery, filters, locationOverride }),
    canUseInitialAds ? initialAds : undefined
  )

  // Бесконечный скролл вместо кнопки «Показать ещё» (см. CatalogAdsGrid) —
  // на главной это единственная лента без явной пагинации в UI, кнопка
  // тут неуместна. watchKey: ads.length — форсирует переоценку видимости
  // сентинела сразу после того, как подгрузилась новая партия карточек (см.
  // сам хук — иначе на коротких списках вторая страница могла бы не
  // подгрузиться, пока пользователь не пошевелит скролл руками).
  const sentinelRef = useInfiniteScrollTrigger({
    hasMore: hasNextPage,
    isLoading: isFetchingNextPage,
    onLoadMore: fetchNextPage,
    watchKey: ads.length
  })

  const trimmedSearchQuery = searchQuery?.trim()
  const emptyMessage = hasLocationOverride
    ? 'В этом регионе пока нет объявлений — попробуйте выбрать другой регион или посмотреть всю Россию'
    : trimmedSearchQuery
      ? `По запросу «${trimmedSearchQuery}» ничего не найдено`
      : filters.hasActiveFilters
        ? 'Ничего не найдено — попробуйте изменить фильтры'
        : 'В этой категории пока нет объявлений'

  // isLoadingCategories учитываем в общем isLoading, ТОЛЬКО когда categories
  // реально нужны прямо сейчас — то есть когда есть slug и мы ждём
  // categoryId (см. useMemo выше). На главной (HomeAdsFeed) slug никогда
  // нет, а categoryId всегда undefined независимо от того, догрузились
  // categories или нет — так что раньше главная держала initialAds под
  // капотом готовыми, но всё равно рисовала скелетон, пока не догрузится
  // ВООБЩЕ не нужный здесь список категорий (isLoadingCategories из
  // useCategories() — чисто клиентский запрос без initialData, на сервере
  // и до первого клиентского фетча всегда true). Из-за этого initialAds
  // с сервера (см. page.tsx главной, S6 в ROADMAP.md) реально никогда не
  // попадали в исходный HTML как видимые карточки — только как данные для
  // гидратации, а LCP-фото так и оставалось недостижимо до клиентского
  // фетча категорий.
  const isWaitingForCategories = Boolean(slug) && isLoadingCategories

  return (
    <>
      <AdsGrid
        ads={ads}
        layout={layout}
        className={className}
        isLoading={isWaitingForCategories || isLoadingAds}
        emptyMessage={emptyMessage}
      />

      {/* Пустой сентинел, а не условно смонтированный/размонтированный —
      IntersectionObserver внутри useInfiniteScrollTrigger сам не делает
      ничего, пока hasNextPage не станет true, так что держать его в DOM
      всегда дешевле и надёжнее, чем гонять ref через условный рендер. */}
      <div ref={sentinelRef} aria-hidden className='h-px w-full' />

      {isFetchingNextPage && (
        <div className='flex justify-center py-6'>
          <Loader2 className='text-muted-foreground size-6 animate-spin' />
        </div>
      )}
    </>
  )
}
