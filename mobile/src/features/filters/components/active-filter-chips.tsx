import { Pressable, Text, View } from 'react-native'

import { useFilterableFeatures } from '@/features/categories/hooks/use-category-features'
import type { Category } from '@/features/categories/types/category.types'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { X } from '@/shared/icons/lucide'

import { useLocations } from '../hooks/use-locations'
import { buildFilterChips } from '../lib/filter-chips'
import type { CatalogFilters } from '../types/filter.types'

interface ActiveFilterChipsProps {
  filters: CatalogFilters
  category: Category | undefined
  onChange: (filters: CatalogFilters) => void
}

// Сводка применённых фильтров над выдачей каталога — как ActiveFilterChips
// сайта: без неё на телефоне не видно, что сейчас отфильтровано, не
// открывая окно фильтров. Нажатие на чип снимает этот фильтр.
export function ActiveFilterChips({ filters, category, onChange }: ActiveFilterChipsProps) {
  const { locations } = useLocations({ enabled: Boolean(filters.regionIsoCode || filters.localityFiasId) })
  const features = useFilterableFeatures(category)
  const iconColor = useThemeColor('--color-gray-500')
  const chips = buildFilterChips(filters, locations, features)

  if (!chips.length) return null

  return (
    <View className='mb-4 flex-row flex-wrap gap-2'>
      {chips.map(chip => (
        <Pressable
          key={chip.key}
          accessibilityRole='button'
          accessibilityLabel={`Убрать фильтр: ${chip.label}`}
          onPress={() => onChange(chip.without)}
          className='max-w-full flex-row items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 active:bg-muted'
        >
          {/* Длинный адрес точки поиска обрезаем, чтобы чип не вылезал за экран. */}
          <Text className='shrink text-sm text-gray-950' numberOfLines={1}>
            {chip.label}
          </Text>
          <X size={14} color={iconColor} />
        </Pressable>
      ))}
    </View>
  )
}
