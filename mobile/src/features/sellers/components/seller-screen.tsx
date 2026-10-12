import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Text, View } from 'react-native'

import { AdsGrid } from '@/features/ads/components/ads-grid'
import { useAdsInfinite } from '@/features/ads/hooks/use-ads-infinite'
import type { AdsFilters } from '@/features/ads/types/ad.types'
import { CatalogSort } from '@/features/filters/components/catalog-sort'
import { DEFAULT_SORT, isAdsSortBy } from '@/features/filters/constants/sort-options'

import { BackButton } from '@/shared/components/back-button'
import { ScreenMessage } from '@/shared/components/screen-message'
import { useRefetchOnFocus } from '@/shared/hooks/use-refetch-on-focus'
import { pluralizeRu } from '@/shared/utils/pluralize'

import { ApiError } from '@/lib/api/api-error'

import { useSeller } from '../hooks/use-seller'
import { SellerCard, SellerCardSkeleton } from './seller-card'

// Страница продавца — как /sellers/:id сайта на телефоне: карточка продавца,
// затем его объявления с сортировкой. Фильтров нет, как и на сайте; сортировка
// — в параметре экрана sortBy, как в адресе страницы сайта.
export function SellerScreen({ id }: { id: string }) {
  const router = useRouter()
  const { sortBy: sortByParam } = useLocalSearchParams<{ sortBy?: string }>()
  const sortBy = isAdsSortBy(sortByParam) ? sortByParam : DEFAULT_SORT
  const seller = useSeller(id)
  const filters = useMemo<AdsFilters>(
    () => ({ sellerId: id, sortBy: sortBy === DEFAULT_SORT ? undefined : sortBy }),
    [id, sortBy]
  )
  const query = useAdsInfinite(filters)

  const { refetch: refetchSeller } = seller
  useRefetchOnFocus(refetchSeller)

  if (seller.error) {
    const isNotFound = seller.error instanceof ApiError && seller.error.statusCode === 404

    return (
      <View className='flex-1'>
        <BackButton />
        {isNotFound ? (
          <ScreenMessage
            title='Продавец не найден'
            description='Такого продавца нет на AgroZone — возможно, аккаунт удалён.'
          />
        ) : (
          <ScreenMessage
            title='Не удалось загрузить продавца'
            description={seller.error.message}
            action={{ title: 'Повторить', onPress: () => void refetchSeller() }}
          />
        )}
      </View>
    )
  }

  const header = (
    <View className='pt-1'>
      {seller.data ? <SellerCard seller={seller.data} /> : <SellerCardSkeleton />}

      <View className='mt-8 mb-4'>
        <CatalogSort
          value={sortBy}
          hasOrigin={false}
          onChange={value => router.setParams({ sortBy: value === DEFAULT_SORT ? undefined : value })}
        />
      </View>
      {query.total > 0 && (
        <Text className='mb-3 text-sm text-gray-500'>
          Найдено {query.total} {pluralizeRu(query.total, ['объявление', 'объявления', 'объявлений'])}
        </Text>
      )}
    </View>
  )

  return (
    <View className='flex-1'>
      <BackButton />
      <AdsGrid query={query} header={header} emptyMessage='У этого продавца пока нет объявлений' />
    </View>
  )
}
