import { useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'

import { useCategories } from '@/features/categories/hooks/use-categories'
import type { Category } from '@/features/categories/types/category.types'

import { Button } from '@/shared/components/button'
import { FormScrollView } from '@/shared/components/form-scroll-view'
import { Heading } from '@/shared/components/heading'
import { useModalInsets } from '@/shared/hooks/use-modal-insets'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { X } from '@/shared/icons/lucide'

import { EMPTY_FILTERS, withFeatureValue } from '../lib/catalog-filters'
import type { CatalogFilters, FeatureFilterValue } from '../types/filter.types'
import { FilterForm } from './filter-form'

interface FilterModalProps {
  visible: boolean
  onClose: () => void
  // Фильтры текущей выдачи — с них начинается черновик.
  filters: CatalogFilters
  category: Category | undefined
  onApply: (filters: CatalogFilters) => void
  onOpenCategory: (categoryPath: string) => void
}

// Окно фильтров во весь экран — как FilterModal сайта на телефоне.
// Изменения копятся в черновике и применяются разом кнопкой «Показать»:
// перезапрашивать выдачу на каждую цифру цены на телефоне незачем.
export function FilterModal({ visible, onClose, filters, category, onApply, onOpenCategory }: FilterModalProps) {
  const { top, bottom } = useModalInsets()
  const { roots } = useCategories()
  const closeIconColor = useThemeColor('--color-gray-950')
  const [draft, setDraft] = useState(filters)
  const [pendingCategory, setPendingCategory] = useState<Category>()
  // Новый ключ формы — поля заново берут значения из черновика (открыли
  // окно, нажали «Сбросить»), а не держат то, что в них набирали раньше.
  const [formKey, setFormKey] = useState(0)

  // Каждое открытие начинается с фильтров выдачи, а не с брошенного
  // черновика прошлого раза.
  const [wasVisible, setWasVisible] = useState(visible)
  if (visible !== wasVisible) {
    setWasVisible(visible)

    if (visible) {
      setDraft(filters)
      setPendingCategory(undefined)
      setFormKey(key => key + 1)
    }
  }

  const reset = () => {
    setDraft(EMPTY_FILTERS)
    setPendingCategory(undefined)
    setFormKey(key => key + 1)
  }

  const patch = (next: Partial<CatalogFilters>) => setDraft(current => ({ ...current, ...next }))

  const changeFeature = (name: string, value: FeatureFilterValue | undefined) =>
    setDraft(current => ({ ...current, features: withFeatureValue(current.features, name, value) }))

  // Выбранная категория — переход в её каталог с чистыми фильтрами, как на
  // сайте; иначе применяем черновик к текущей выдаче.
  const show = () => {
    if (pendingCategory) {
      onOpenCategory(pendingCategory.fullPath)
    } else {
      onApply(draft)
    }

    onClose()
  }

  return (
    <Modal visible={visible} animationType='slide' onRequestClose={onClose}>
      <View className='flex-1 bg-background' style={{ paddingTop: top, paddingBottom: bottom }}>
        <View className='flex-row items-center pt-4 pr-2 pb-6 pl-4'>
          <View className='flex-1'>
            <Heading level={2}>Фильтры</Heading>
          </View>
          <Pressable accessibilityRole='button' onPress={reset} className='h-10 justify-center px-4' hitSlop={4}>
            <Text className='text-base font-medium text-gray-900'>Сбросить</Text>
          </Pressable>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Закрыть'
            onPress={onClose}
            className='size-7 items-center justify-center rounded-md bg-gray-100'
            hitSlop={8}
          >
            <X size={16} color={closeIconColor} />
          </Pressable>
        </View>

        <FormScrollView key={formKey} contentClassName='px-4 pb-4'>
          <FilterForm
            draft={draft}
            onPatch={patch}
            onFeatureChange={changeFeature}
            category={category}
            roots={roots}
            pendingCategory={pendingCategory}
            onSelectCategory={setPendingCategory}
          />
        </FormScrollView>

        <View className='px-4 pt-4 pb-4'>
          <Button variant='secondary' title='Показать' onPress={show} />
        </View>
      </View>
    </Modal>
  )
}
