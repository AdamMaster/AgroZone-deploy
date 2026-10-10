import { useMemo, useState } from 'react'
import { View } from 'react-native'

import type { Category } from '@/features/categories/types/category.types'

import { Combobox } from '@/shared/components/combobox'
import { FieldLabel } from '@/shared/components/field-label'
import { createTextMatcher } from '@/shared/utils/search-text'

interface CategoryPickerProps {
  // Подкатегории текущей категории или весь верхний уровень каталога.
  categories: readonly Category[]
  // Выбранная, но ещё не применённая категория.
  selected: Category | undefined
  onSelect: (category: Category) => void
}

// Выбор категории с поиском по названию — как SubcategoryList сайта: у
// некоторых разделов больше 50 подкатегорий, и простой список превратился
// бы в стену строк.
export function CategoryPicker({ categories, selected, onSelect }: CategoryPickerProps) {
  // null — пользователь ничего не печатал: в поле название выбранной.
  const [text, setText] = useState<string | null>(null)
  const query = text ?? ''

  const items = useMemo(() => {
    const matches = createTextMatcher(query)

    return categories
      .filter(category => matches(category.name))
      .map(category => ({ key: category.id, label: category.name, category }))
  }, [categories, query])

  if (!categories.length) return null

  return (
    <View className='gap-2'>
      <FieldLabel>Категория</FieldLabel>
      <Combobox
        text={text ?? selected?.name ?? ''}
        onChangeText={setText}
        items={items}
        onSelect={item => {
          setText(null)
          onSelect(item.category)
        }}
        placeholder='Найти категорию'
        accessibilityLabel='Категория'
        emptyText='Категории не найдены.'
      />
    </View>
  )
}
