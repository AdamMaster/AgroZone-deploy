'use client'

import { LayoutGrid, LayoutList } from 'lucide-react'

import { useCatalogViewStore } from '@/store'

import { useMediaQuery } from '@/shared/hooks'

import { cn } from '@/lib/utils'

import { CategoryTitle } from '../../categories/components/category-title'
import { useCategories } from '../../categories/hooks/use-categories'
import { CatalogSort, Filter } from '../../filter/components'
import { useCatalogFilters } from '../../filter/hooks/use-catalog-filters'
import { AdCardList } from './ad-card-list'
import { AdsClient } from './ads-client'

interface CatalogContentProps {
  serverSlug?: string | null
}

export const CatalogContent = ({ serverSlug }: CatalogContentProps) => {
  const { layout: gridLayout, setLayout: setGridLayout } = useCatalogViewStore()
  const { categories } = useCategories()
  // Сайдбар — сразу применяет каждое изменение (immediate: true по
  // умолчанию), в отличие от мобильного окна фильтра (FilterModal), где
  // фильтры копятся и применяются только по кнопке "Показать".
  const filters = useCatalogFilters()
  const isTopLevelCategory = Boolean(serverSlug) && !serverSlug!.includes('/')

  // На мобилках (< md, 768px) карточка списка (AdCardList) не помещается —
  // её грид в три колонки (картинка/контент/продавец) требует минимум
  // ~396px. Поэтому ниже md всегда показываем сеточную раскладку (как
  // LayoutGrid), а сам переключатель раскладки скрываем — переключать там
  // нечего.
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
