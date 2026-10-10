import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { useCallback, useState } from 'react'
import { ActivityIndicator, RefreshControl, Text, View } from 'react-native'
import { toast } from 'sonner-native'

import { useCreateAdAction } from '@/features/ads/hooks/use-create-ad-action'
import { useProfile } from '@/features/auth/hooks/use-profile'

import { Button } from '@/shared/components/button'
import { Heading } from '@/shared/components/heading'
import { LineTabs } from '@/shared/components/line-tabs'
import { ScreenMessage } from '@/shared/components/screen-message'
import { useHideOnScroll } from '@/shared/hooks/use-hide-on-scroll'
import { useRefetchOnFocus } from '@/shared/hooks/use-refetch-on-focus'
import { isFutureDate } from '@/shared/utils/date'

import type { MyAdsTabKey } from '../constants/my-ads-tabs'
import { useMyAdsList, useMyAdsTabs } from '../hooks/use-my-ads'
import type { MyAd } from '../types/my-ad.types'
import { CreateAdFab } from './create-ad-fab'
import { MyAdCard, MyAdCardSkeleton } from './my-ad-card'
import { MyAdsEmpty } from './my-ads-empty'

const SKELETON_COUNT = 3
// Под последней строкой — место для плавающей кнопки, чтобы она не
// закрывала карандаш «Редактировать».
const LIST_BOTTOM_PADDING = 96

const keyExtractor = (ad: MyAd) => ad.id

// Экраны объявления и формы — следующие этапы; до них честно говорим об
// этом, а не открываем пустой экран.
const openAd = () => toast.info('Страница объявления появится в следующем обновлении приложения')
const editAd = () => toast.info('Редактирование объявления появится в следующем обновлении приложения')

function CardsSkeleton() {
  return (
    <View className='gap-6'>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <MyAdCardSkeleton key={index} />
      ))}
    </View>
  )
}

// Вкладка «Объявления» — как ContentAds сайта на телефоне: заголовок,
// вкладки по статусам со счётчиками, список своих объявлений и плавающая
// кнопка «Разместить объявление».
export function MyAdsScreen() {
  const tabsQuery = useMyAdsTabs()
  const [selectedKey, setSelectedKey] = useState<MyAdsTabKey>()
  // Выбранная вкладка могла опустеть (объявление сняли с сайта) — тогда
  // первая непустая, как вкладка по умолчанию.
  const activeTab = tabsQuery.tabs.find(tab => tab.key === selectedKey) ?? tabsQuery.tabs[0]
  const list = useMyAdsList(activeTab)
  const { data: profile } = useProfile()
  const isOwnerPremium = isFutureDate(profile?.premiumUntil)
  const createAd = useCreateAdAction()
  const fab = useHideOnScroll()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { refetch: refetchTabs } = tabsQuery
  const { refetch: refetchList } = list

  // Объявления меняются и вне приложения (на сайте, модератором) —
  // обновляем при каждом возвращении на вкладку.
  useRefetchOnFocus(
    useCallback(() => {
      void refetchTabs()
      void refetchList()
    }, [refetchTabs, refetchList])
  )

  const refresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([tabsQuery.refetch(), list.refetch()])
    } finally {
      setIsRefreshing(false)
    }
  }

  const renderItem: ListRenderItem<MyAd> = useCallback(
    ({ item }) => (
      <View className='pb-6'>
        <MyAdCard ad={item} isOwnerPremium={isOwnerPremium} onOpen={openAd} onEdit={editAd} />
      </View>
    ),
    [isOwnerPremium]
  )

  const heading = (
    <Heading level={2} className='mb-4'>
      Мои объявления
    </Heading>
  )

  if (tabsQuery.isPending) {
    return (
      <View className='px-4 pt-3'>
        <Heading level={2} className='mb-6'>
          Мои объявления
        </Heading>
        <View className='mb-5 flex-row gap-3'>
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <View key={index} className='h-11 w-[150px] rounded-lg bg-gray-100' />
          ))}
        </View>
        <CardsSkeleton />
      </View>
    )
  }

  if (tabsQuery.error) {
    return (
      <ScreenMessage
        title='Не удалось загрузить объявления'
        description={tabsQuery.error.message}
        action={{ title: 'Повторить', onPress: () => void tabsQuery.refetch() }}
      />
    )
  }

  const refreshControl = (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={() => void refresh()}
      colorsClassName='accent-primary'
      tintColorClassName='accent-primary'
    />
  )

  if (!activeTab) {
    return (
      <FlashList
        data={[]}
        renderItem={null}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ListEmptyComponent={<MyAdsEmpty onCreateAd={createAd} />}
        refreshControl={refreshControl}
      />
    )
  }

  const listEmpty = list.isPending ? (
    <CardsSkeleton />
  ) : list.error ? (
    <ScreenMessage
      title='Не удалось загрузить объявления'
      description={list.error.message}
      action={{ title: 'Повторить', onPress: () => void list.refetch() }}
    />
  ) : null

  const footer = list.isFetchingNextPage ? (
    <View className='py-6'>
      <ActivityIndicator colorClassName='accent-gray-500' />
    </View>
  ) : list.isFetchNextPageError ? (
    <View className='items-center gap-3 py-6'>
      <Text className='text-center text-sm text-gray-500'>{list.error?.message}</Text>
      <Button title='Загрузить ещё' onPress={() => void list.fetchNextPage()} />
    </View>
  ) : null

  return (
    <View className='flex-1'>
      <FlashList
        data={list.ads}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: LIST_BOTTOM_PADDING }}
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage && !list.isFetchNextPageError) {
            void list.fetchNextPage()
          }
        }}
        onEndReachedThreshold={1}
        onScroll={fab.onScroll}
        scrollEventThrottle={16}
        ListHeaderComponent={
          <View>
            {heading}
            <View className='mb-4'>
              <LineTabs
                isScrollable
                value={activeTab.key}
                tabs={tabsQuery.tabs.map(tab => ({ value: tab.key, label: tab.label, count: tab.count }))}
                onChange={setSelectedKey}
              />
            </View>
          </View>
        }
        ListEmptyComponent={listEmpty}
        ListFooterComponent={footer}
        refreshControl={refreshControl}
      />
      <CreateAdFab visible={fab.isVisible} onPress={createAd} />
    </View>
  )
}
