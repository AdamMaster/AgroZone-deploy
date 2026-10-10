import { Fragment } from 'react'
import { Pressable, Text, View } from 'react-native'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ChevronRight } from '@/shared/icons/lucide'

export interface BreadcrumbItem {
  name: string
  // Нет — это текущая страница, она не нажимается.
  onPress?: () => void
}

// Хлебные крошки каталога — как CategoryBreadcrumbs сайта: «Объявления ›
// Раздел › Подраздел», последний пункт — текущая категория.
export function CatalogBreadcrumbs({ items }: { items: readonly BreadcrumbItem[] }) {
  const iconColor = useThemeColor('--color-gray-500')

  return (
    <View className='flex-row flex-wrap items-center gap-y-1 pb-5'>
      {items.map((item, index) => (
        <Fragment key={`${index}-${item.name}`}>
          {item.onPress ? (
            <Pressable accessibilityRole='link' onPress={item.onPress} hitSlop={4}>
              <Text className='text-sm text-gray-500'>{item.name}</Text>
            </Pressable>
          ) : (
            <Text className='text-sm text-gray-500'>{item.name}</Text>
          )}
          {index < items.length - 1 && (
            <View className='mr-0.5 ml-1'>
              <ChevronRight size={14} color={iconColor} />
            </View>
          )}
        </Fragment>
      ))}
    </View>
  )
}
