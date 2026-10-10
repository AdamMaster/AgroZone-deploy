import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ChevronRight, Search, SlidersHorizontal, X } from '@/shared/icons/lucide'

import { useSearchSuggestions } from '../hooks/use-search-suggestions'
import type { SearchSuggestion } from '../types/search.types'

interface SearchOverlayProps {
  visible: boolean
  initialQuery: string
  onClose: () => void
  onSubmit: (query: string) => void
  onSelectSuggestion: (suggestion: SearchSuggestion) => void
  onOpenFilters: () => void
  // Окно поиска закрылось полностью (только iOS) — см. SearchHeader.
  onDismiss: () => void
}

// Строка поиска в фокусе — как SearchBar сайта на телефоне: поле
// становится белым, справа появляется «Отменить», страница под ним
// затемняется, а под полем выпадают подсказки (категории и объявления).
export function SearchOverlay({
  visible,
  initialQuery,
  onClose,
  onSubmit,
  onSelectSuggestion,
  onOpenFilters,
  onDismiss
}: SearchOverlayProps) {
  const { top } = useSafeAreaInsets()
  const [query, setQuery] = useState(initialQuery)
  const [panelHeight, setPanelHeight] = useState(0)
  const suggestions = useSearchSuggestions(query)
  const mutedColor = useThemeColor('--color-gray-500')
  const textColor = useThemeColor('--color-gray-950')

  return (
    <Modal
      visible={visible}
      transparent
      animationType='fade'
      statusBarTranslucent
      onRequestClose={onClose}
      onDismiss={onDismiss}
      // Каждое открытие начинается с текущего запроса экрана, а не с того,
      // что набрали и бросили в прошлый раз.
      onShow={() => setQuery(initialQuery)}
    >
      <View className='flex-1'>
        <View
          className='bg-background px-4 py-3'
          style={{ paddingTop: top + 12 }}
          onLayout={event => setPanelHeight(event.nativeEvent.layout.height)}
        >
          <View className='flex-row items-center'>
            <View className='flex-1 flex-row items-center rounded-lg bg-white p-[2px] dark:bg-neutral-700'>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder='Поиск по объявлениям'
                placeholderTextColorClassName='accent-gray-500'
                accessibilityLabel='Поиск по объявлениям'
                autoFocus
                autoCorrect={false}
                returnKeyType='search'
                enterKeyHint='search'
                onSubmitEditing={() => onSubmit(query.trim())}
                className='h-10 flex-1 rounded-[10px] pl-3 text-[15px] text-gray-950'
              />
              {query.length > 0 && (
                <Pressable
                  accessibilityRole='button'
                  accessibilityLabel='Очистить поиск'
                  onPress={() => setQuery('')}
                  className='h-10 justify-center px-3'
                >
                  <X size={20} color={textColor} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole='button'
                accessibilityLabel='Открыть фильтр'
                onPress={onOpenFilters}
                className='h-10 justify-center px-2.5'
              >
                <SlidersHorizontal size={20} color={mutedColor} />
              </Pressable>
            </View>
            <Pressable accessibilityRole='button' onPress={onClose} className='pl-3' hitSlop={8}>
              <Text className='text-xs text-gray-950'>Отменить</Text>
            </Pressable>
          </View>
        </View>

        <Pressable accessibilityLabel='Закрыть поиск' className='flex-1 bg-black/20' onPress={onClose} />

        {suggestions.length > 0 && (
          <View
            className='absolute right-4 left-4 max-h-64 overflow-hidden rounded-lg bg-white shadow-lg dark:bg-neutral-700'
            style={{ top: panelHeight - 8 }}
          >
            <ScrollView keyboardShouldPersistTaps='handled' contentContainerClassName='py-2'>
              {suggestions.map(suggestion => (
                <Pressable
                  key={`${suggestion.type}-${suggestion.id}`}
                  accessibilityRole='link'
                  onPress={() => onSelectSuggestion(suggestion)}
                  className='flex-row items-center gap-3 px-4 py-3 active:bg-gray-50'
                >
                  {suggestion.type !== 'category' && <Search size={16} color={textColor} />}
                  <View className='flex-1 flex-row flex-wrap items-center gap-1'>
                    <Text className='font-medium text-gray-950'>{suggestion.name}</Text>
                    <ChevronRight size={16} color={mutedColor} />
                    {suggestion.type === 'category' && suggestion.parentName && (
                      <Text className='text-gray-500'>{suggestion.parentName}</Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  )
}
