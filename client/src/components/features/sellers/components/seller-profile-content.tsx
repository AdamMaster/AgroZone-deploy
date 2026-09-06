'use client'

import { LayoutGrid, LayoutList, Loader2 } from 'lucide-react'
import { useMemo } from 'react'

import { AdsGrid } from '@/components/features/ads/components'
import { useAdsInfinite } from '@/components/features/ads/hooks'
import { IAdsListResponse } from '@/components/features/ads/types/ad.types'
import { CatalogSort } from '@/components/features/filter/components'
import { useCatalogFilters } from '@/components/features/filter/hooks/use-catalog-filters'
import { Button } from '@/components/ui'

import { useMediaQuery } from '@/shared/hooks'
import { pluralizeRu } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { useCatalogViewStore } from '@/store'

interface SellerProfileContentProps {
  sellerId: string
  // Первая страница, отрисованная сервером (см. sellers/[id]/page.tsx) —
  // тот же приём SSR + "Показать ещё", что и у CatalogAdsGrid (S1 в
  // ROADMAP.md), просто без category/фильтров: продавец уже фиксирован
  // sellerId, а сортировку переиспользуем из useCatalogFilters (она пишет
  // sortBy в URL текущей страницы, а не обязательно каталога — хук не
  // завязан на конкретный путь).
  initialAds: IAdsListResponse
}

export function SellerProfileContent({ sellerId, initialAds }: SellerProfileContentProps) {
  const { layout: gridLayout, setLayout: setGridLayout } = useCatalogViewStore()
  const filters = useCatalogFilters()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const effectiveGridLayout = isMobile ? 'cols-4' : gridLayout

  // Намеренно НЕ buildAdsQueryParams (та функция тянет category/price/
  // регион/фичи — на странице продавца фильтров нет вообще, см. обсуждение
  // с пользователем). Только sellerId (фиксирован) + sortBy (единственное,
  // что тут можно менять).
  const params = useMemo(() => ({ sellerId, sortBy: filters.sortBy }), [sellerId, filters.sortBy])

  const { ads, total, isFetchingNextPage, hasNextPage, fetchNextPage } = useAdsInfinite(params, initialAds)

  return (
    <div>
      <div className='mb-4 flex items-center justify-between gap-2.5 sm:mb-6'>
        <div className='hidden items-center gap-2.5 md:flex'>
          <button aria-label='Вид списком' onClick={() => setGridLayout('cols-1')}>
            <LayoutList className={cn('size-6', effectiveGridLayout === 'cols-1' ? 'text-gray-900' : 'text-gray-400')} />
          </button>
          <button aria-label='Вид сеткой' onClick={() => setGridLayout('cols-4')}>
            <LayoutGrid className={cn('size-6', effectiveGridLayout === 'cols-4' ? 'text-gray-900' : 'text-gray-400')} />
          </button>
        </div>
        <CatalogSort />
      </div>

      {total > 0 && (
        <p className='mb-3 text-sm text-gray-500 sm:mb-4'>
          Найдено {total} {pluralizeRu(total, ['объявление', 'объявления', 'объявлений'])}
        </p>
      )}

      <AdsGrid
        ads={ads}
        layout={effectiveGridLayout}
        isLoading={false}
        emptyMessage='У этого продавца пока нет объявлений'
      />

      {hasNextPage && (
        <div className='mt-6 flex justify-center sm:mt-8'>
          <Button variant='outline' size='lg' disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
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
