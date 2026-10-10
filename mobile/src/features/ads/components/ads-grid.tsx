import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { type ReactElement, useCallback } from 'react'
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/shared/components/button'
import { ScreenMessage } from '@/shared/components/screen-message'

import { useAdNavigation } from '../hooks/use-ad-navigation'
import type { useAdsInfinite } from '../hooks/use-ads-infinite'
import { useToggleFavorite } from '../hooks/use-toggle-favorite'
import type { AdListItem } from '../types/ad.types'
import { AdCard, AdCardSkeleton } from './ad-card'

// Сетка как у сайта в мобильной вёрстке: две колонки, между колонками 4px,
// между рядами 16px, поля экрана 16px (Container).
const NUM_COLUMNS = 2
const COLUMN_GAP = 4
const ROW_GAP = 16
const SCREEN_PADDING = 16
// Сколько заглушек показывать при первой загрузке.
const SKELETON_COUNT = 6

const keyExtractor = (ad: AdListItem) => ad.id

// Отступ между колонками делим пополам между соседними ячейками: так обе
// колонки получаются одинаковой ширины (FlashList делит строку поровну).
const getCellStyle = (index: number) => {
  const isLeftColumn = index % NUM_COLUMNS === 0

  return {
    paddingLeft: isLeftColumn ? 0 : COLUMN_GAP / 2,
    paddingRight: isLeftColumn ? COLUMN_GAP / 2 : 0,
    paddingBottom: ROW_GAP
  }
}

interface AdsGridProps {
  query: ReturnType<typeof useAdsInfinite>
  // Всё, что над сеткой (поиск, категории, заголовок) — прокручивается
  // вместе с лентой, как на сайте.
  header?: ReactElement
  emptyMessage: string
}

// Сетка объявлений с бесконечной подгрузкой и pull-to-refresh — общая для
// главной и каталога (AdsGrid + AdsClient сайта).
export function AdsGrid({ query, header, emptyMessage }: AdsGridProps) {
  const { bottom } = useSafeAreaInsets()
  const { toggleFavorite, isPending: isFavoritePending, pendingAdId } = useToggleFavorite()
  const { openAd } = useAdNavigation()
  const handleOpenAd = useCallback((ad: AdListItem) => openAd(ad.id), [openAd])
  const {
    ads,
    error,
    isPending,
    isError,
    isFetchNextPageError,
    isRefetchError,
    isRefreshing,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refresh,
    refetch
  } = query

  const handleToggleFavorite = useCallback(
    (ad: AdListItem) => toggleFavorite({ adId: ad.id, isFavorite: !!ad.isFavorite }),
    [toggleFavorite]
  )

  const renderAd: ListRenderItem<AdListItem> = ({ item, index }) => (
    <View style={getCellStyle(index)}>
      <AdCard
        ad={item}
        onOpen={handleOpenAd}
        onToggleFavorite={handleToggleFavorite}
        isFavoritePending={isFavoritePending && pendingAdId === item.id}
      />
    </View>
  )

  // Следующую страницу не запрашиваем, пока висит ошибка предыдущей:
  // иначе при каждом касании конца списка уходил бы новый запрос, а
  // пользователь видел бы мигание. Повтор — по кнопке в подвале.
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage])

  const contentPadding = { paddingHorizontal: SCREEN_PADDING, paddingBottom: SCREEN_PADDING + bottom }

  const listHeader = (
    <View>
      {header}
      {/* Лента уже показана, но обновление не прошло — оставляем старые
      объявления и честно говорим, что они могли устареть. */}
      {isRefetchError && (
        <View className='mb-4 rounded-xl bg-gray-100 px-4 py-3'>
          <Text className='text-sm font-medium text-gray-950'>Не удалось обновить объявления</Text>
          <Text className='text-xs text-gray-500'>{error?.message}</Text>
        </View>
      )}
    </View>
  )

  const listEmpty = isPending ? (
    <View className='flex-row flex-wrap'>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <View key={index} className='w-1/2' style={getCellStyle(index)}>
          <AdCardSkeleton />
        </View>
      ))}
    </View>
  ) : isError ? (
    <ScreenMessage
      title='Не удалось загрузить объявления'
      description={error?.message}
      action={{ title: 'Повторить', onPress: () => void refetch() }}
    />
  ) : (
    <Text className='py-10 text-center text-[15px] text-gray-500'>{emptyMessage}</Text>
  )

  const footer = isFetchingNextPage ? (
    <View className='py-6'>
      <ActivityIndicator colorClassName='accent-gray-500' />
    </View>
  ) : isFetchNextPageError ? (
    <View className='items-center gap-3 py-6'>
      <Text className='text-center text-sm text-gray-500'>{error?.message}</Text>
      <Button title='Загрузить ещё' onPress={() => void fetchNextPage()} />
    </View>
  ) : null

  return (
    <FlashList
      data={ads}
      renderItem={renderAd}
      keyExtractor={keyExtractor}
      numColumns={NUM_COLUMNS}
      contentContainerStyle={contentPadding}
      onEndReached={loadMore}
      // Подгружаем следующую страницу заранее, за полтора экрана до конца
      // списка, — при обычной прокрутке пользователь не упирается в загрузку.
      onEndReachedThreshold={1.5}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={listEmpty}
      ListFooterComponent={footer}
      keyboardShouldPersistTaps='handled'
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={refresh}
          colorsClassName='accent-primary'
          tintColorClassName='accent-primary'
        />
      }
    />
  )
}
