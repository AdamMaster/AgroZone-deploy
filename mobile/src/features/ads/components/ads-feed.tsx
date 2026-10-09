import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { useCallback } from 'react'
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button } from '@/shared/components/button'
import { ScreenMessage } from '@/shared/components/screen-message'

import { useAdsFeed } from '../hooks/use-ads-feed'
import type { AdListItem } from '../types/ad.types'
import { AdCard, AdCardSkeleton } from './ad-card'

const NUM_COLUMNS = 2
const COLUMN_GAP = 12
const ROW_GAP = 20
const SCREEN_PADDING = 12
// Сколько заглушек показывать при первой загрузке — заполняет экран
// телефона, но не больше одной страницы.
const SKELETON_COUNT = 6

const keyExtractor = (ad: AdListItem) => ad.id

// Отступы между колонками делим пополам между соседними ячейками: так обе
// колонки получаются одинаковой ширины (FlashList делит строку поровну).
const getCellStyle = (index: number) => {
  const isLeftColumn = index % NUM_COLUMNS === 0

  return {
    paddingLeft: isLeftColumn ? 0 : COLUMN_GAP / 2,
    paddingRight: isLeftColumn ? COLUMN_GAP / 2 : 0,
    paddingBottom: ROW_GAP
  }
}

const renderAd: ListRenderItem<AdListItem> = ({ item, index }) => (
  <View style={getCellStyle(index)}>
    <AdCard ad={item} />
  </View>
)

export function AdsFeed() {
  const { bottom } = useSafeAreaInsets()
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
  } = useAdsFeed()

  // Следующую страницу не запрашиваем, пока висит ошибка предыдущей:
  // иначе при каждом касании конца списка уходил бы новый запрос, а
  // пользователь видел бы мигание. Повтор — по кнопке в подвале.
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isFetchNextPageError) {
      void fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage])

  const retry = useCallback(() => void refetch(), [refetch])
  const retryNextPage = useCallback(() => void fetchNextPage(), [fetchNextPage])

  const contentPadding = { padding: SCREEN_PADDING, paddingBottom: SCREEN_PADDING + bottom }

  if (isPending) {
    return (
      <View className='flex-row flex-wrap' style={contentPadding}>
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <View key={index} className='w-1/2' style={getCellStyle(index)}>
            <AdCardSkeleton />
          </View>
        ))}
      </View>
    )
  }

  if (isError && ads.length === 0) {
    return (
      <ScreenMessage
        title='Не удалось загрузить объявления'
        description={error?.message}
        action={{ title: 'Повторить', onPress: retry }}
      />
    )
  }

  const footer = isFetchingNextPage ? (
    <View className='py-6'>
      <ActivityIndicator colorClassName='accent-primary' />
    </View>
  ) : isFetchNextPageError ? (
    <View className='items-center gap-3 py-6'>
      <Text className='text-center text-sm text-muted-foreground'>{error?.message}</Text>
      <Button title='Загрузить ещё' onPress={retryNextPage} />
    </View>
  ) : null

  // Лента уже показана, но обновление (pull-to-refresh или фоновое) не
  // прошло — оставляем старые объявления и честно говорим, что они могли
  // устареть.
  const header = isRefetchError ? (
    <View className='mb-4 rounded-xl bg-muted px-4 py-3'>
      <Text className='text-sm font-medium text-foreground'>Не удалось обновить ленту</Text>
      <Text className='text-xs text-muted-foreground'>{error?.message}</Text>
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
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={
        <ScreenMessage title='Объявлений пока нет' description='Потяните вниз, чтобы обновить ленту' />
      }
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
