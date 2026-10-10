import { useRouter } from 'expo-router'
import { useRef, useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'

import type { Category } from '@/features/categories/types/category.types'
import { FilterModal } from '@/features/filters/components/filter-modal'
import type { CatalogFilters } from '@/features/filters/types/filter.types'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { SlidersHorizontal, X } from '@/shared/icons/lucide'

import { parseCatalogUrl } from '../lib/catalog-link'
import type { SearchSuggestion } from '../types/search.types'
import { SearchOverlay } from './search-overlay'

interface SearchHeaderProps {
  // Текущий поисковый запрос экрана (в каталоге), пусто — на главной.
  query?: string
  // Крестик в поле — убрать запрос из текущего каталога, как на сайте.
  onClear?: () => void
  // Фильтры выдачи этого экрана и её категория (в каталоге).
  filters: CatalogFilters
  category?: Category
  onApplyFilters: (filters: CatalogFilters) => void
  onOpenCategory: (categoryPath: string) => void
}

// Шапка главной и каталога — как Header сайта на телефоне: только строка
// поиска с кнопкой фильтра. Нажатие на строку открывает поиск с
// подсказками (SearchOverlay).
export function SearchHeader({
  query = '',
  onClear,
  filters,
  category,
  onApplyFilters,
  onOpenCategory
}: SearchHeaderProps) {
  const router = useRouter()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  // Фильтры открыли из поиска: на iOS второе модальное окно не покажется,
  // пока первое не закрылось до конца, — открываем по onDismiss поиска.
  const openFiltersAfterSearchRef = useRef(false)
  const mutedColor = useThemeColor('--color-gray-500')
  const textColor = useThemeColor('--color-gray-950')

  const openFiltersFromSearch = () => {
    setIsSearchOpen(false)

    if (Platform.OS === 'ios') {
      openFiltersAfterSearchRef.current = true
    } else {
      setIsFiltersOpen(true)
    }
  }

  const handleSearchDismiss = () => {
    if (!openFiltersAfterSearchRef.current) return

    openFiltersAfterSearchRef.current = false
    setIsFiltersOpen(true)
  }

  // Как handleSearch сайта: пустой запрос — весь каталог, иначе каталог по
  // запросу (категория при новом поиске сбрасывается).
  const submitSearch = (value: string) => {
    setIsSearchOpen(false)
    router.push({ pathname: '/catalog', params: value ? { search: value } : {} })
  }

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    setIsSearchOpen(false)
    router.push({ pathname: '/catalog', params: { ...parseCatalogUrl(suggestion.url) } })
  }

  return (
    <View className='py-3'>
      <View className='flex-row items-center rounded-lg bg-gray-100 p-[2px]'>
        <Pressable
          accessibilityRole='search'
          accessibilityLabel='Поиск по объявлениям'
          onPress={() => setIsSearchOpen(true)}
          className='h-10 flex-1 justify-center pl-3'
        >
          <Text className={`text-[15px] ${query ? 'text-gray-950' : 'text-gray-500'}`} numberOfLines={1}>
            {query || 'Поиск по объявлениям'}
          </Text>
        </Pressable>
        {query.length > 0 && onClear && (
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Очистить поиск'
            onPress={onClear}
            className='h-10 justify-center px-3'
          >
            <X size={20} color={textColor} />
          </Pressable>
        )}
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Открыть фильтр'
          onPress={() => setIsFiltersOpen(true)}
          className='h-10 justify-center px-2.5'
        >
          <SlidersHorizontal size={20} color={mutedColor} />
        </Pressable>
      </View>

      <SearchOverlay
        visible={isSearchOpen}
        initialQuery={query}
        onClose={() => setIsSearchOpen(false)}
        onSubmit={submitSearch}
        onSelectSuggestion={selectSuggestion}
        onOpenFilters={openFiltersFromSearch}
        onDismiss={handleSearchDismiss}
      />

      <FilterModal
        visible={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        filters={filters}
        category={category}
        onApply={onApplyFilters}
        onOpenCategory={onOpenCategory}
      />
    </View>
  )
}
