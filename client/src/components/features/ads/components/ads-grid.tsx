'use client'

import { AdCard, AdCardList } from '@/components/features/ads/components'
import { Skeleton } from '@/components/ui'

import { cn } from '@/lib/utils'

import { IAd } from '../types/ad.types'

const SKELETON_COUNT = 10

// Чисто отрисовочная часть списка объявлений (сетка/список карточек +
// скелетон + пустое состояние) — вынесена из AdsClient, чтобы её же
// использовал и CatalogAdsGrid (SSR + «Показать ещё» для страницы каталога,
// см. S1 в ROADMAP.md). Сама логика получения данных (useAds/useAdsInfinite)
// в этот компонент сознательно не вынесена — у AdsClient и CatalogAdsGrid
// она принципиально разная (один запрос без пагинации vs
// initialData + useInfiniteQuery).
export function getAdsGridClassNames(layout?: string): string {
  return layout === 'cols-1'
    ? 'grid-cols-1'
    : layout === 'cols-4'
      ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-1 md:gap-y-4'
      : 'grid-cols-2 xl:grid-cols-5 lg:grid-cols-4 md:grid-cols-4 sm:grid-cols-3 gap-x-1'
}

interface AdsGridProps {
  ads: IAd[]
  layout?: string
  className?: 'cols-1' | 'cols-4'
  isLoading: boolean
  emptyMessage: string
}

export function AdsGrid({ ads, layout, className, isLoading, emptyMessage }: AdsGridProps) {
  const classNames = getAdsGridClassNames(layout)

  if (isLoading) {
    return (
      <div className={cn('grid gap-6', classNames, className)}>
        {Array.from({ length: SKELETON_COUNT }).map((_, i) =>
          layout === 'cols-1' ? <AdCardList.Skeleton key={i} /> : <Skeleton key={i} className='h-82 rounded-lg' />
        )}
      </div>
    )
  }

  if (!ads.length) {
    return <div className='py-10 text-center text-gray-500'>{emptyMessage}</div>
  }

  return (
    <div className={cn('grid gap-x-6 gap-y-4 sm:gap-x-2.5 md:gap-x-2.5 xl:gap-x-6', classNames, className)}>
      {ads.map(ad => (layout === 'cols-1' ? <AdCardList key={ad.id} ad={ad} /> : <AdCard key={ad.id} ad={ad} />))}
    </div>
  )
}
