import { useLocalSearchParams, useRouter } from 'expo-router'

import { CatalogScreen } from '@/features/catalog/components/catalog-screen'
import { useRouteCatalogFilters } from '@/features/filters/hooks/use-route-catalog-filters'

import { TabScreen } from '@/shared/components/tab-screen'

// Параметры — как у адреса каталога сайта: /catalog/<category>?search=&
// плюс параметры фильтров и сортировки (см. useRouteCatalogFilters).
type CatalogParams = { category?: string; search?: string }

export default function CatalogRoute() {
  const router = useRouter()
  const { category, search } = useLocalSearchParams<CatalogParams>()
  const catalogFilters = useRouteCatalogFilters()

  return (
    <TabScreen>
      <CatalogScreen
        categoryPath={category || undefined}
        search={search || undefined}
        onClearSearch={() => router.setParams({ search: undefined })}
        catalogFilters={catalogFilters}
      />
    </TabScreen>
  )
}
