import { useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { BackHandler, Pressable, TextInput, View, useWindowDimensions } from 'react-native'

import type { Category } from '@/features/categories/types/category.types'
import { FilterModal } from '@/features/filters/components/filter-modal'
import type { CatalogFilters } from '@/features/filters/types/filter.types'

import { Portal } from '@/shared/components/portal'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { SlidersHorizontal, X } from '@/shared/icons/lucide'

import { useSearchSuggestions } from '../hooks/use-search-suggestions'
import { parseCatalogUrl } from '../lib/catalog-link'
import { useSearchHistoryStore } from '../store/search-history-store'
import type { SearchSuggestion } from '../types/search.types'
import { SearchCancelButton } from './search-cancel-button'
import { SearchFocusLayer, type WindowRect } from './search-focus-layer'

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

const measure = (view: View | null) =>
  new Promise<WindowRect | null>(resolve => {
    if (!view) {
      resolve(null)
      return
    }
    view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }))
  })

// Шапка главной и каталога — SearchBar сайта на телефоне: настоящее поле
// поиска с кнопкой фильтра. В фокусе поле белеет, справа появляется
// «Отменить», страница затемняется, под полем — подсказки.
export function SearchHeader({
  query = '',
  onClear,
  filters,
  category,
  onApplyFilters,
  onOpenCategory
}: SearchHeaderProps) {
  const router = useRouter()
  const { width: windowWidth, height: windowHeight } = useWindowDimensions()
  const inputRef = useRef<TextInput>(null)
  const barRef = useRef<View>(null)
  const fieldRef = useRef<View>(null)
  const [text, setText] = useState(query)
  const [syncedQuery, setSyncedQuery] = useState(query)
  const [isFocused, setIsFocused] = useState(false)
  const [layout, setLayout] = useState<{ bar: WindowRect; field: WindowRect } | null>(null)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const suggestions = useSearchSuggestions(isFocused ? text : '')
  const {
    queries: history,
    add: addToHistory,
    remove: removeFromHistory,
    clear: clearHistory
  } = useSearchHistoryStore()
  const isHistoryShown = isFocused && text.trim() === ''
  const textColor = useThemeColor('--color-gray-950')

  // Запрос экрана сменился (новый поиск, запрос убрали) — поле показывает его.
  if (query !== syncedQuery) {
    setSyncedQuery(query)
    setText(query)
  }

  // Где строка и поле на экране — слой поиска ловит нажатия вокруг строки, а
  // подсказки выпадают под полем. Перемеряем при каждой смене раскладки
  // строки (появилась «Отменить», поле сузилось).
  const measureLayout = useCallback(async () => {
    const [bar, field] = await Promise.all([measure(barRef.current), measure(fieldRef.current)])
    if (bar && field) setLayout({ bar, field })
  }, [])

  const close = useCallback(() => {
    inputRef.current?.blur()
    setIsFocused(false)
  }, [])

  // «Назад» на Android закрывает поиск, а не уходит со страницы.
  useEffect(() => {
    if (!isFocused) return

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close()
      return true
    })

    return () => subscription.remove()
  }, [isFocused, close])

  // Как handleSearch сайта: пустой запрос — весь каталог, иначе каталог по
  // запросу (категория при новом поиске сбрасывается).
  const search = (value: string) => {
    addToHistory(value)
    close()
    router.push({ pathname: '/catalog', params: value ? { search: value } : {} })
  }

  const submit = () => search(text.trim())

  const selectHistory = (value: string) => {
    setText(value)
    search(value)
  }

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    setText(suggestion.name)
    close()
    router.push({ pathname: '/catalog', params: { ...parseCatalogUrl(suggestion.url) } })
  }

  const clear = () => {
    setText('')
    if (query && onClear) onClear()
  }

  const openFilters = () => {
    close()
    setIsFiltersOpen(true)
  }

  return (
    // Дерево шапки при фокусе не меняется: всё, что нужно в фокусе, смонтировано
    // всегда с теми же стилями, а на фокус переключается только видимость
    // (hidden ↔ flex) и цвет. Иначе Android перестраивает вьюхи вокруг поля, и
    // оно теряет фокус вместе с клавиатурой.
    // Шапка стоит над остальной лентой (zIndex), а строка — над затемнением
    // внутри неё: как на сайте, где подложка z-50 лежит под формой z-100.
    <View collapsable={false} className='py-3' style={{ zIndex: 2 }}>
      {/* Затемнение страницы (bg-black/20 сайта): выходит за границы шапки на
          весь экран и лежит под строкой. Нажатия по нему ловит SearchFocusLayer. */}
      <View
        pointerEvents='none'
        className={`absolute bg-black/20 dark:bg-black/80 ${isFocused ? 'flex' : 'hidden'}`}
        style={{ top: -windowHeight, bottom: -windowHeight, left: -windowWidth, right: -windowWidth, zIndex: 0 }}
      />
      <View
        ref={barRef}
        className='flex-row items-center'
        style={{ zIndex: 1 }}
        onLayout={() => isFocused && void measureLayout()}
      >
        <View
          ref={fieldRef}
          className={`flex-1 flex-row items-center rounded-2xl p-[2px] ${
            isFocused ? 'bg-white dark:bg-neutral-800' : 'bg-primary dark:bg-primary'
          }`}
        >
          <View className='flex-1 flex-row items-center rounded-[14px] bg-white dark:bg-neutral-800'>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              onFocus={() => {
                setIsFocused(true)
                void measureLayout()
              }}
              onSubmitEditing={submit}
              placeholder='Поиск по объявлениям'
              placeholderTextColorClassName='accent-gray-500'
              accessibilityLabel='Поиск по объявлениям'
              accessibilityRole='search'
              autoCorrect={false}
              returnKeyType='search'
              enterKeyHint='search'
              submitBehavior='blurAndSubmit'
              className='h-13 flex-1 pt-0 pb-0 pl-3.5 text-base text-gray-950'
            />
            {text.length > 0 && (
              <Pressable
                accessibilityRole='button'
                accessibilityLabel='Очистить поиск'
                onPress={clear}
                className='h-10 justify-center px-3'
              >
                <X size={20} color={textColor} />
              </Pressable>
            )}
          </View>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Открыть фильтр'
            onPress={openFilters}
            className={`h-10 justify-center px-2.5 ${isFocused ? 'hidden' : 'block'}`}
          >
            <SlidersHorizontal size={20} color={'#fff'} />
          </Pressable>
        </View>
        <View collapsable={false} className={isFocused ? 'flex' : 'hidden'}>
          <SearchCancelButton onPress={close} />
        </View>
      </View>

      <Portal>
        <SearchFocusLayer
          isActive={isFocused}
          bar={layout?.bar}
          field={layout?.field}
          suggestions={suggestions}
          history={history}
          isHistoryShown={isHistoryShown}
          onSelect={selectSuggestion}
          onSelectHistory={selectHistory}
          onRemoveHistory={removeFromHistory}
          onClearHistory={clearHistory}
          onClose={close}
        />
      </Portal>

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
