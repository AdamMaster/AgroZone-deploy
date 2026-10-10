import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { useAdCounters, useAdViewStats } from '@/features/ads/hooks/use-ad-detail'

import { Heading } from '@/shared/components/heading'
import { ScreenMessage } from '@/shared/components/screen-message'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ArrowLeft, ChevronLeft, ChevronRight } from '@/shared/icons/lucide'
import { formatShortIsoDate } from '@/shared/utils/date'

import { ViewsChart } from './views-chart'

// Статистика объявления для владельца — как AdStats сайта: просмотры по
// дням с листанием недель и общие счётчики.
export function AdStatsScreen({ id }: { id: string }) {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = useState(0)
  const stats = useAdViewStats(id, weekOffset)
  const counters = useAdCounters(id, { enabled: true })
  const iconColor = useThemeColor('--color-gray-950')
  const data = stats.data
  const canGoBack = !data || weekOffset < data.maxWeekOffset
  const canGoForward = weekOffset > 0

  return (
    <ScrollView contentContainerClassName='px-4 pb-8'>
      <View className='-mx-4 mb-6 flex-row items-center gap-3'>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Назад'
          onPress={() => router.back()}
          className='size-13 items-center justify-center'
        >
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Heading level={2}>Статистика объявления</Heading>
      </View>

      {stats.error && !data ? (
        <ScreenMessage
          title='Не удалось загрузить статистику'
          description={stats.error.message}
          action={{ title: 'Повторить', onPress: () => void stats.refetch() }}
        />
      ) : (
        <View className='mb-5'>
          <View className='mb-4 flex-row flex-wrap items-center justify-between gap-3'>
            <Heading level={4}>Просмотры</Heading>
            <View className='flex-row items-center gap-1'>
              <Pressable
                accessibilityRole='button'
                accessibilityLabel='Предыдущая неделя'
                disabled={!canGoBack || stats.isPending}
                onPress={() => setWeekOffset(value => value + 1)}
                className='size-8 items-center justify-center rounded-md bg-gray-100 disabled:opacity-50'
              >
                <ChevronLeft size={16} color={iconColor} />
              </Pressable>
              <Text className='min-w-[100px] text-center text-sm text-gray-500'>
                {data ? `${formatShortIsoDate(data.weekStart)} – ${formatShortIsoDate(data.weekEnd)}` : ' '}
              </Text>
              <Pressable
                accessibilityRole='button'
                accessibilityLabel='Следующая неделя'
                disabled={!canGoForward || stats.isPending}
                onPress={() => setWeekOffset(value => Math.max(value - 1, 0))}
                className='size-8 items-center justify-center rounded-md bg-gray-100 disabled:opacity-50'
              >
                <ChevronRight size={16} color={iconColor} />
              </Pressable>
            </View>
          </View>

          <Text className='mb-4 text-sm text-gray-500'>
            За неделю: <Text className='text-lg font-semibold text-gray-900'>{data?.total ?? 0}</Text>
          </Text>

          {data ? (
            <View className={stats.isPlaceholderData ? 'opacity-50' : ''}>
              <ViewsChart days={data.days} />
            </View>
          ) : (
            <View className='h-[180px] w-full rounded-xl bg-gray-100' />
          )}
        </View>
      )}

      {counters.data && (
        <View className='flex-row flex-wrap gap-6'>
          <Text className='text-sm text-gray-500'>
            Всего просмотров:{' '}
            <Text className='font-medium text-gray-900 dark:text-white'>
              {counters.data.viewsTotal}
              {counters.data.viewsToday > 0 && (
                <Text className='font-medium text-primary'> (+{counters.data.viewsToday})</Text>
              )}
            </Text>
          </Text>
          <Text className='text-sm text-gray-500'>
            В избранном:{' '}
            <Text className='font-medium text-gray-900 dark:text-white'>{counters.data.favoritesCount}</Text>
          </Text>
        </View>
      )}
    </ScrollView>
  )
}
