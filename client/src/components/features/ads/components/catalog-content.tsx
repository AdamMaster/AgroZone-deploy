'use client'

import { useCatalogViewStore } from '@/store'
import { LayoutGrid, LayoutList } from 'lucide-react'

import { useMediaQuery } from '@/shared/hooks'

import { cn } from '@/lib/utils'

import { CategoryTitle } from '../../categories/components/category-title'
import { useCategories } from '../../categories/hooks/use-categories'
import { CatalogSort, Filter } from '../../filter/components'
import { useCatalogFilters } from '../../filter/hooks/use-catalog-filters'
import { AdsClient } from './ads-client'

interface CatalogContentProps {
  serverSlug?: string | null
}

export const CatalogContent = ({ serverSlug }: CatalogContentProps) => {
  const { layout: gridLayout, setLayout: setGridLayout } = useCatalogViewStore()
  const { categories } = useCategories()
  const filters = useCatalogFilters()
  const isTopLevelCategory = Boolean(serverSlug) && !serverSlug!.includes('/')
  const isMobile = useMediaQuery('(max-width: 767px)')
  const effectiveGridLayout = isMobile ? 'cols-4' : gridLayout

  return (
    <div className={cn(!isTopLevelCategory && 'pt-4 sm:pt-6')}>
      <CategoryTitle categories={categories} className='mb-4 sm:mb-6' />
      <div className={cn('grid grid-cols-1 gap-8 xl:grid-cols-[320px_1fr]')}>
        <div className='hidden md:block'>
          <Filter categories={categories} filters={filters} />
        </div>
        <div>
          <div className='mb-4 flex items-center justify-between gap-2.5 sm:mb-8'>
            <div className='hidden items-center gap-2.5 md:flex'>
              <button aria-label='Вид списком' onClick={() => setGridLayout('cols-1')}>
                <LayoutList
                  className={cn('size-6', effectiveGridLayout === 'cols-1' ? 'text-gray-900' : 'text-gray-400')}
                />
              </button>
              <button aria-label='Вид сеткой' onClick={() => setGridLayout('cols-4')}>
                <LayoutGrid
                  className={cn('size-6', effectiveGridLayout === 'cols-4' ? 'text-gray-900' : 'text-gray-400')}
                />
              </button>
            </div>
            <CatalogSort />
          </div>
          <AdsClient serverSlug={serverSlug} layout={effectiveGridLayout} />
        </div>
      </div>
    </div>
  )
}
