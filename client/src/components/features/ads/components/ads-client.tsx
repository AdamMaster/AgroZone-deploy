'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

import { AdCard, AdCardList } from '@/components/features/ads/components'
import { Skeleton } from '@/components/ui'

import { cn } from '@/lib/utils'

import { useCategories } from '../../categories/hooks/use-categories'
import { ICategory } from '../../categories/types'
import { useCatalogFilters } from '../../filter/hooks/use-catalog-filters'
import { useAds } from '../hooks'

const SKELETON_COUNT = 10

const findIdBySlug = (categories: ICategory[], slug?: string | null): string | undefined => {
  if (!slug) return

  for (const category of categories) {
    if (category.slug === slug) {
      return category.id
    }

    if (category.children?.length) {
      const found = findIdBySlug(category.children, slug)
      if (found) return found
    }
  }

  return
}

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

export function AdsClient({ serverSlug, layout, className, locationOverride }: AdsClientProps) {
  const searchParams = useSearchParams()
  const { categories, isLoadingCategories } = useCategories()
  const filters = useCatalogFilters()
  const searchQuery = searchParams.get('search') ?? undefined
  const slug = serverSlug?.split('/').at(-1) ?? searchParams.get('category') ?? undefined

  const categoryId = useMemo(() => {
    if (!slug) return undefined
    return findIdBySlug(categories, slug)
  }, [categories, slug])

  const regionIsoCode = locationOverride ? locationOverride.regionIsoCode : filters.regionIsoCode
  const localityFiasId = locationOverride ? locationOverride.localityFiasId : filters.localityFiasId
  const hasLocationOverride = Boolean(
    locationOverride && (locationOverride.regionIsoCode || locationOverride.localityFiasId)
  )

  const { ads, isLoadingAds } = useAds({
    categoryId,
    search: searchQuery,
    sortBy: filters.sortBy,
    unit: filters.unit,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    regionIsoCode,
    localityFiasId,
    sellerType: filters.sellerType,
    features: Object.keys(filters.features).length ? JSON.stringify(filters.features) : undefined
  })

  const classNames =
    layout === 'cols-1'
      ? 'grid-cols-1'
      : layout === 'cols-4'
        ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-1 md:gap-y-4'
        : 'grid-cols-2 xl:grid-cols-5 lg:grid-cols-4 md:grid-cols-4 sm:grid-cols-3 gap-x-1'

  if (isLoadingCategories || isLoadingAds) {
    return (
      <div className={cn('grid gap-6', classNames, className)}>
        {Array.from({ length: SKELETON_COUNT }).map((_, i) =>
          layout === 'cols-1' ? <AdCardList.Skeleton key={i} /> : <Skeleton key={i} className='h-82 rounded-lg' />
        )}
      </div>
    )
  }

  if (!ads.length) {
    return (
      <div className='py-10 text-center text-gray-500'>
        {hasLocationOverride
          ? 'В этом регионе пока нет объявлений — попробуйте выбрать другой регион или посмотреть всю Россию'
          : filters.hasActiveFilters
            ? 'Ничего не найдено — попробуйте изменить фильтры'
            : 'В этой категории пока нет объявлений'}
      </div>
    )
  }

  return (
    <div className={cn('grid gap-x-6 gap-y-4 sm:gap-x-2.5 md:gap-x-2.5 xl:gap-x-6', classNames, className)}>
      {ads.map(ad => {
        return layout === 'cols-1' ? <AdCardList key={ad.id} ad={ad} /> : <AdCard key={ad.id} ad={ad} />
      })}
    </div>
  )
}
