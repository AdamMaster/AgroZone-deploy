import { useRouter } from 'expo-router'
import { useCallback } from 'react'
import { ScrollView, Text, View } from 'react-native'

import { Button } from '@/shared/components/button'

import { useCategories } from '../hooks/use-categories'
import type { Category } from '../types/category.types'
import { CategoryTile } from './category-tile'

// Ширина «полотна» плиток — как w-280 (1120px) у мобильной сетки сайта:
// категории укладываются в два ряда, и их листают вбок.
const GRID_WIDTH = 1120

// Плитки категорий на главной (CategoryGrid сайта, мобильная вёрстка).
// Категория с подкатегориями открывает окно со списком подкатегорий, без
// них — сразу каталог.
export function CategoryGrid() {
  const router = useRouter()
  const { roots, error, isFetching, refetch } = useCategories()

  const openCategory = useCallback(
    (category: Category) => {
      if (category.children?.length) {
        router.push({ pathname: '/categories', params: { path: category.fullPath } })
      } else {
        router.push({ pathname: '/catalog', params: { category: category.fullPath } })
      }
    },
    [router]
  )

  // Пока дерево не загрузилось, место под плитки не резервируем: лента
  // ниже тоже ещё грузится, и экран не прыгает. Если загрузка не удалась —
  // говорим об этом, иначе главная выглядит так, будто категорий нет.
  if (!roots.length) {
    return error ? (
      <View className='mb-7 flex-row items-center gap-3 rounded-xl bg-gray-100 px-4 py-3'>
        <Text className='min-w-0 flex-1 text-sm text-gray-900'>Не удалось загрузить категории</Text>
        <Button title='Повторить' variant='outline' size='sm' isLoading={isFetching} onPress={() => void refetch()} />
      </View>
    ) : null
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className='mb-7'>
      <View className='flex-row flex-wrap gap-1' style={{ width: GRID_WIDTH }}>
        {roots.map(category => (
          <CategoryTile key={category.id} category={category} onPress={openCategory} />
        ))}
      </View>
    </ScrollView>
  )
}
