import { Pressable, Text, View } from 'react-native'

import type { AdCounters } from '@/features/ads/types/ad-detail.types'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ChevronRight, Eye, Heart } from '@/shared/icons/lucide'

interface AdCountersPanelProps {
  counters: AdCounters
  onOpenStats: () => void
}

// Просмотры (+ за сегодня) и сколько раз объявление добавили в избранное —
// как AdCountersPanel сайта; нажатие открывает статистику.
export function AdCountersPanel({ counters, onOpenStats }: AdCountersPanelProps) {
  const iconColor = useThemeColor('--color-gray-500')

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={`Просмотров: ${counters.viewsTotal}, в избранном: ${counters.favoritesCount}. Статистика`}
      onPress={onOpenStats}
      className='mb-4 flex-row items-center justify-between gap-3 rounded-xl px-4 py-3 active:bg-gray-50'
    >
      <View className='flex-row items-center gap-4'>
        <View className='flex-row items-center gap-1.5'>
          <Eye size={16} color={iconColor} />
          <Text className='text-sm text-gray-950'>{counters.viewsTotal}</Text>
          {counters.viewsToday > 0 && <Text className='text-sm font-medium text-primary'>+{counters.viewsToday}</Text>}
        </View>
        <View className='flex-row items-center gap-1.5'>
          <Heart size={16} color={iconColor} />
          <Text className='text-sm text-gray-950'>{counters.favoritesCount}</Text>
        </View>
      </View>
      <View className='flex-row items-center gap-1'>
        <Text className='text-sm text-gray-500'>Статистика</Text>
        <ChevronRight size={16} color={iconColor} />
      </View>
    </Pressable>
  )
}
