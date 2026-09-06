'use client'

import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useMemo } from 'react'

import { Button } from '@/components/ui'

import { findCategoryIdBySlug } from '@/components/features/categories/utils/category-utils'

import { useCategories } from '../../categories/hooks/use-categories'
import { useCatalogFilters } from '../../filter/hooks/use-catalog-filters'
import { useAdsInfinite } from '../hooks'
import { IAdsListResponse } from '../types/ad.types'
import { buildAdsQueryParams } from '../utils/build-ads-query-params'
import { AdsGrid } from './ads-grid'

interface CatalogAdsGridProps {
  serverSlug?: string | null
  layout?: string
  className?: 'cols-1' | 'cols-4'
  // Первая страница, уже отрисованная сервером (см. page.tsx) — сюда
  // приходит ИМЕННО тот же запрос, что построит этот компонент сам
  // (buildAdsQueryParams с теми же входными данными), поэтому подстав
  // ленная сюда initialData у useAdsInfinite не разъезжается с тем, что
  // ожидает клиент. Компонент должен получать новый key (см. CatalogContent
  // — key строится из serverSlug + querystring) при каждой смене
  // категории/фильтра, чтобы размонтироваться и заново засеяться свежим
  // initialAds вместо того, чтобы копить старые «Показать ещё»-страницы
  // поверх нового запроса.
  initialAds: IAdsListResponse
}

// SSR первой страницы + «Показать ещё» на клиенте (S1 в ROADMAP.md) —
// именно поэтому отдельно от AdsClient (который используется и на главной,
// см. HomeAdsFeed, где initialData с сервера нет и пагинация не нужна).
export function CatalogAdsGrid({ serverSlug, layout, className, initialAds }: CatalogAdsGridProps) {
  const searchParams = useSearchParams()
  const { categories, isLoadingCategories } = useCategories()
  const filters = useCatalogFilters()
  const searchQuery = searchParams.get('search') ?? undefined
  const slug = serverSlug?.split('/').at(-1) ?? searchParams.get('category') ?? undefined

  const categoryId = useMemo(() => {
    if (!slug) return undefined
    return findCategoryIdBySlug(categories, slug)
  }, [categories, slug])

  const params = useMemo(
    () => buildAdsQueryParams({ categoryId, search: searchQuery, filters }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryId, searchQuery, filters.sortBy, filters.unit, filters.minPrice, filters.maxPrice, filters.regionIsoCode, filters.localityFiasId, filters.sellerType, filters.features]
  )

  const { ads, isFetchingNextPage, hasNextPage, fetchNextPage } = useAdsInfinite(params, initialAds)

  const emptyMessage = filters.hasActiveFilters
    ? 'Ничего не найдено — попробуйте изменить фильтры'
    : 'В этой категории пока нет объявлений'

  return (
    <div>
      <AdsGrid
        ads={ads}
        layout={layout}
        className={className}
        // Пока не известен точный categoryId (сайдбар/поисковая строка ещё
        // тянут категории) initialAds всё равно уже есть с сервера — грид
        // никогда не показывает пустой скелетон поверх готовых данных
        // первой отрисовки.
        isLoading={false}
        emptyMessage={emptyMessage}
      />
      {hasNextPage && (
        <div className='mt-6 flex justify-center sm:mt-8'>
          <Button
            variant='outline'
            size='lg'
            // isLoadingCategories — короткое окно сразу после монтирования,
            // пока клиентский список категорий (нужен для categoryId
            // следующей страницы) ещё не пришёл; initialAds с сервера уже
            // отрисованы, так что это не блокирует первую отрисовку.
            disabled={isFetchingNextPage || isLoadingCategories}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className='size-4 animate-spin' />
                Загружаем...
              </>
            ) : (
              'Показать ещё'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
