import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, type TextInput, View } from 'react-native'
import { toast } from 'sonner-native'

import { categoryFeaturesQuery } from '@/features/categories/hooks/use-category-features'
import type { Category, CategoryFeature } from '@/features/categories/types/category.types'

import { Combobox } from '@/shared/components/combobox'
import { Heading } from '@/shared/components/heading'

import { useCategorySearch } from '../hooks/use-category-search'

// Раздел для всего, что не нашлось: подсказка ведёт в его подкатегории.
const OTHER_CATEGORY_NAME = 'Прочее'

interface CategoryStepProps {
  roots: readonly Category[]
  // Название выбранной категории (последнее звено пути), как хлебные
  // крошки сайта на телефоне.
  selectedName: string | null
  onSelect: (categoryId: string, features: CategoryFeature[]) => void
}

// «Выберите категорию» — CategoryCascader сайта на телефоне: поиск по
// названию с подсказками (только конечные категории, плюс смысловые
// подсказки сервера). Категория считается выбранной, когда загрузились её
// характеристики, — до этого «Продолжить» недоступна.
export function CategoryStep({ roots, selectedName, onSelect }: CategoryStepProps) {
  const queryClient = useQueryClient()
  const inputRef = useRef<TextInput>(null)
  const [text, setText] = useState('')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const { items, isLoading } = useCategorySearch(roots, text)

  const select = async (categoryId: string) => {
    setLoadingId(categoryId)
    try {
      const features = await queryClient.fetchQuery(categoryFeaturesQuery(categoryId))
      onSelect(categoryId, features)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось загрузить категорию')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <View>
      <Heading level={4} className='mb-2.5 font-medium'>
        Выберите категорию
      </Heading>

      <Combobox
        text={text}
        onChangeText={setText}
        items={items}
        onSelect={item => void select(item.categoryId)}
        placeholder='Поиск нужной категории'
        accessibilityLabel='Поиск нужной категории'
        emptyText=''
        emptyContent={
          <View className='items-center gap-2 px-3.5 py-6'>
            <Text className='text-center text-sm text-gray-500'>
              Ничего не нашли. Попробуйте более простое или общее название товара.
            </Text>
            <Pressable
              accessibilityRole='button'
              hitSlop={6}
              onPress={() => {
                setText(OTHER_CATEGORY_NAME)
                // Нажатие сняло фокус с поля — возвращаем, чтобы список
                // подкатегорий «Прочего» сразу раскрылся.
                inputRef.current?.focus()
              }}
            >
              <Text className='text-sm text-primary underline'>Или посмотрите категорию «Прочее»</Text>
            </Pressable>
          </View>
        }
        isLoading={isLoading}
        opensOnlyWithText
        inputRef={inputRef}
      />

      {loadingId ? (
        <View className='mt-3 items-start'>
          <ActivityIndicator colorClassName='accent-gray-500' />
        </View>
      ) : (
        selectedName && <Text className='mt-3 text-sm text-gray-500'>{selectedName}</Text>
      )}
    </View>
  )
}
