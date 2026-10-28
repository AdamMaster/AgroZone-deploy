import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMemo } from 'react'
import { Text, View } from 'react-native'

import { AdsGrid } from '@/features/ads/components/ads-grid'
import { useAdsInfinite } from '@/features/ads/hooks/use-ads-infinite'
import type { AdsFilters } from '@/features/ads/types/ad.types'
import { CatalogSort } from '@/features/filters/components/catalog-sort'
import { DEFAULT_SORT, isAdsSortBy } from '@/features/filters/constants/sort-options'
import { useSiteFlags } from '@/features/site-settings/hooks/use-site-flags'

import { BackButton } from '@/shared/components/back-button'
import { LineTabs } from '@/shared/components/line-tabs'
import { ScreenMessage } from '@/shared/components/screen-message'
import { useRefetchOnFocus } from '@/shared/hooks/use-refetch-on-focus'
import { pluralizeRu } from '@/shared/utils/pluralize'

import { ApiError } from '@/lib/api/api-error'

import { useSeller } from '../hooks/use-seller'
import { SellerActions } from './seller-actions'
import { SellerCard, SellerCardSkeleton } from './seller-card'
import { SellerReviewsList } from './seller-reviews-list'

type SellerTab = 'ads' | 'reviews'

// Страница продавца — как /sellers/:id сайта на телефоне: карточка продавца,
// затем его объявления с сортировкой. Фильтров нет, как и на сайте; сортировка
// и открытая вкладка — в параметрах экрана (sortBy, tab), как в адресе страницы
// сайта. Пока рейтинги выключены в админке — ровно прежний вид без вкладок;
// когда включены — вкладки «Объявления» и «Отзывы».
export function SellerScreen({ id }: { id: string }) {
  const router = useRouter()
  const { sortBy: sortByParam, tab: tabParam } = useLocalSearchParams<{ sortBy?: string; tab?: string }>()
  const { sellerRatings } = useSiteFlags()
  const tab: SellerTab = sellerRatings && tabParam === 'reviews' ? 'reviews' : 'ads'
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

  const openReviews = () => router.setParams({ tab: 'reviews' })
  const reviewsCount = seller.data?.rating?.count

  // Карточка продавца, жалоба и вкладки — общая шапка обеих вкладок.
  const top = (
    <View className='pt-1'>
      {seller.data ? <SellerCard seller={seller.data} onOpenReviews={openReviews} /> : <SellerCardSkeleton />}

      {sellerRatings && (
        <View className='mt-4 gap-5'>
          <SellerActions sellerId={id} />
          <LineTabs<SellerTab>
            value={tab}
            tabs={[
              { value: 'ads', label: 'Объявления' },
              { value: 'reviews', label: 'Отзывы', count: reviewsCount || undefined }
            ]}
            onChange={value => router.setParams({ tab: value === 'reviews' ? 'reviews' : undefined })}
          />
        </View>
      )}
    </View>
  )

  if (tab === 'reviews') {
    return (
      <View className='flex-1'>
        <BackButton />
        <SellerReviewsList sellerId={id} header={top} />
      </View>
    )
  }

  const header = (
    <View>
      {top}

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
