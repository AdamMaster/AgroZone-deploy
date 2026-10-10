import { Pressable, Text, View } from 'react-native'

import { StyledImage } from '@/shared/components/styled'

import { CATEGORY_ICONS } from '../constants/category-icons'
import type { Category } from '../types/category.types'

interface CategoryTileProps {
  category: Category
  onPress: (category: Category) => void
}

// Плитка категории верхнего уровня на главной — как CategoryItem сайта в
// мобильной вёрстке: серая карточка 76px высотой, название слева сверху,
// иллюстрация в правом нижнем углу.
export function CategoryTile({ category, onPress }: CategoryTileProps) {
  const icon = CATEGORY_ICONS[category.slug]

  return (
    <Pressable
      accessibilityRole='link'
      accessibilityLabel={category.name}
      onPress={() => onPress(category)}
      className='relative h-19 max-w-40 overflow-hidden rounded-lg bg-gray-100 px-3.5 py-2.5 pr-8 active:bg-gray-200'
    >
      {icon && (
        <StyledImage
          source={icon}
          className='absolute -right-2 bottom-0 h-12 w-14'
          contentFit='contain'
          contentPosition='right bottom'
        />
      )}
      <View className='z-10'>
        <Text className='text-[13px] leading-tight text-gray-950'>{category.name}</Text>
      </View>
    </Pressable>
  )
}
