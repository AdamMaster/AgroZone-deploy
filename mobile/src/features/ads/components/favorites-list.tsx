import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { useCallback, useState } from 'react'
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native'

import { Heading } from '@/shared/components/heading'
import { ScreenMessage } from '@/shared/components/screen-message'

import { useAdNavigation } from '../hooks/use-ad-navigation'
import { useFavoritesInfinite } from '../hooks/use-favorites-infinite'
import { useToggleFavorite } from '../hooks/use-toggle-favorite'
import type { FavoriteAd } from '../types/ad.types'
import { FavoriteAdCard, FavoriteAdCardSkeleton } from './favorite-ad-card'

const keyExtractor = (ad: FavoriteAd) => ad.id

// Вкладка «Избранное» — как ContentFavorites сайта: заголовок, список строк
// или подсказка, как добавить объявления.
export function FavoritesList() {
  const { favorites, error, isPending, isFetchingNextPage, hasNextPage, fetchNextPage, refetch } =
    useFavoritesInfinite()
  // Крутилка — только когда пользователь сам потянул список (фоновое
  // обновление при возврате в приложение её не показывает).
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refresh = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
    } finally {
      setIsRefreshing(false)
    }
  }
  const { toggleFavorite, isPending: isRemoving, pendingAdId } = useToggleFavorite()
  const { openAd } = useAdNavigation()
  const openFavorite = useCallback((ad: FavoriteAd) => openAd(ad.id), [openAd])

  const removeFavorite = useCallback(
    (ad: FavoriteAd) => toggleFavorite({ adId: ad.id, isFavorite: true }),
    [toggleFavorite]
  )

  const renderItem: ListRenderItem<FavoriteAd> = ({ item }) => (
    <View className='pb-4'>
      <FavoriteAdCard
        ad={item}
        onOpen={openFavorite}
        onRemove={removeFavorite}
        isRemoving={isRemoving && pendingAdId === item.id}
      />
    </View>
  )

  const listEmpty = isPending ? (
    <View className='gap-4'>
      {Array.from({ length: 3 }, (_, index) => (
        <FavoriteAdCardSkeleton key={index} />
      ))}
    </View>
  ) : error ? (
    <ScreenMessage
      title='Не удалось загрузить избранное'
      description={error.message}
      action={{ title: 'Повторить', onPress: () => void refetch() }}
    />
  ) : (
    <View>
      <Heading level={3} className='mb-2'>
        Добавляйте объявления в избранное
      </Heading>
      <Text className='text-[15px] leading-[1.4] text-gray-600'>
        Нашли что-то интересное? Нажмите на сердечко в результатах поиска, или кнопку «В избранное» в объявлении, чтобы
        не потерять интересные предложения.
      </Text>
    </View>
  )

  return (
    <FlashList
      data={favorites}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) void fetchNextPage()
      }}
      onEndReachedThreshold={1}
      ListHeaderComponent={
        <Heading level={2} className='mb-8'>
          Избранное
        </Heading>
      }
      ListEmptyComponent={listEmpty}
      ListFooterComponent={
        isFetchingNextPage ? (
          <View className='py-6'>
            <ActivityIndicator colorClassName='accent-gray-500' />
          </View>
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={() => void refresh()}
          colorsClassName='accent-primary'
          tintColorClassName='accent-primary'
        />
      }
    />
  )
}
