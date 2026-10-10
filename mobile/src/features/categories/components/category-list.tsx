import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import type { Category } from '../types/category.types'

interface CategoryListProps {
  // Категория, подкатегории которой показываем.
  category: Category
}

const VISIBLE_CHILDREN = 5

// Окно подкатегорий — как CategoryList сайта в мобильной вёрстке: название
// раздела, под ним подкатегории со «›», а под каждой — до пяти её
// подкатегорий и «Ещё N».
export function CategoryList({ category }: CategoryListProps) {
  const router = useRouter()
  const [expandedIds, setExpandedIds] = useState<readonly string[]>([])
  const items = category.children ?? []
  const hasAnyChildren = items.some(item => item.children?.length)

  // Как на сайте: окно закрывается и открывается каталог выбранной категории.
  const openCatalog = (fullPath: string) => {
    router.dismiss()
    router.push({ pathname: '/catalog', params: { category: fullPath } })
  }

  const toggleExpanded = (id: string) =>
    setExpandedIds(current => (current.includes(id) ? current.filter(itemId => itemId !== id) : [...current, id]))

  return (
    <View>
      <Text className='mb-6 pr-10 text-xl font-bold text-gray-950'>{category.name}</Text>

      {items.map(item => {
        const children = item.children ?? []
        const isExpanded = expandedIds.includes(item.id)
        const visibleChildren = isExpanded ? children : children.slice(0, VISIBLE_CHILDREN)

        return (
          <View key={item.id} className={hasAnyChildren ? 'pb-4' : 'pb-3'}>
            <Pressable accessibilityRole='link' onPress={() => openCatalog(item.fullPath)}>
              <Text className={`text-[15px] text-gray-950 ${hasAnyChildren ? 'pb-0.5 font-bold' : ''}`}>
                {item.name}
                {'  ›'}
              </Text>
            </Pressable>

            {visibleChildren.map(child => (
              <Pressable key={child.id} accessibilityRole='link' onPress={() => openCatalog(child.fullPath)}>
                <Text className='py-1 text-sm text-gray-950'>{child.name}</Text>
              </Pressable>
            ))}

            {children.length > VISIBLE_CHILDREN && (
              <Pressable accessibilityRole='button' onPress={() => toggleExpanded(item.id)}>
                <Text className='text-sm text-gray-500'>
                  {isExpanded ? 'Скрыть' : `Ещё ${children.length - VISIBLE_CHILDREN}`}
                </Text>
              </Pressable>
            )}
          </View>
        )
      })}
    </View>
  )
}
