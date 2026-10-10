import { useMemo } from 'react'
import { View } from 'react-native'

import { AdsGrid } from '@/features/ads/components/ads-grid'
import { useAdsInfinite } from '@/features/ads/hooks/use-ads-infinite'
import { CategoryGrid } from '@/features/categories/components/category-grid'
import { useRouteCatalogFilters } from '@/features/filters/hooks/use-route-catalog-filters'
import { toAdsFilters } from '@/features/filters/lib/catalog-filters'
import { SearchHeader } from '@/features/search/components/search-header'

import { TabScreen } from '@/shared/components/tab-screen'

import { WelcomeBanner } from './welcome-banner'

// Главная — как на сайте на телефоне: строка поиска с фильтром, плитки
// категорий, приветственный баннер и лента объявлений; всё прокручивается
// вместе. Фильтры из окна фильтров применяются к ленте главной, как на
// сайте (параметры адреса «/»).
export function HomeScreen() {
  const { filters, setFilters, openCategory } = useRouteCatalogFilters()
  const adsFilters = useMemo(() => toAdsFilters({ filters }), [filters])
  const query = useAdsInfinite(adsFilters)

  return (
    <TabScreen>
      <AdsGrid
        query={query}
        header={
          <View>
            <SearchHeader filters={filters} onApplyFilters={setFilters} onOpenCategory={openCategory} />
            <CategoryGrid />
            <WelcomeBanner />
          </View>
        }
        emptyMessage='В этой категории пока нет объявлений'
      />
    </TabScreen>
  )
}
