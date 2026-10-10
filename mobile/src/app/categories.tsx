import { useLocalSearchParams, useRouter } from 'expo-router'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { CategoryList } from '@/features/categories/components/category-list'
import { useCategories } from '@/features/categories/hooks/use-categories'

import { ScreenMessage } from '@/shared/components/screen-message'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { X } from '@/shared/icons/lucide'

// Окно подкатегорий (CategoriesModal сайта): на телефоне — на весь экран,
// с крестиком в углу.
export default function CategoriesRoute() {
  const router = useRouter()
  const { top, bottom } = useSafeAreaInsets()
  const { path } = useLocalSearchParams<{ path?: string }>()
  const { categoryMap, isPending } = useCategories()
  const closeIconColor = useThemeColor('--color-gray-500')
  const category = path ? categoryMap.get(path)?.category : undefined

  return (
    <View className='flex-1 bg-background' style={{ paddingTop: top }}>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Закрыть'
        onPress={() => router.back()}
        hitSlop={8}
        className='absolute right-4 z-10 p-1'
        style={{ top: top + 12 }}
      >
        <X size={20} color={closeIconColor} />
      </Pressable>

      {category ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 16 + bottom }}>
          <CategoryList category={category} />
        </ScrollView>
      ) : (
        !isPending && <ScreenMessage title='Категория не найдена' />
      )}
    </View>
  )
}
