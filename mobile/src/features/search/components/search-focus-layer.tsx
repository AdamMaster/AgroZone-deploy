import { useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ChevronRight, Clock, Search, X } from '@/shared/icons/lucide'

import type { SearchSuggestion } from '../types/search.types'

// Прямоугольник в координатах окна (measureInWindow).
export interface WindowRect {
  x: number
  y: number
  width: number
  height: number
}

interface SearchFocusLayerProps {
  // Слой смонтирован всегда, а в фокусе поиска только показывается (flex ↔
  // hidden): так при фокусе поля в дереве экрана ничего не добавляется.
  isActive: boolean
  // Строка поиска с «Отменить» — нажатия на неё слой пропускает. Пока поле ни
  // разу не измеряли, их нет.
  bar?: WindowRect
  // Само поле — под ним, на его ширину, выпадают подсказки.
  field?: WindowRect
  suggestions: readonly SearchSuggestion[]
  // Недавние запросы — показываются под пустым полем.
  history: readonly string[]
  isHistoryShown: boolean
  onSelect: (suggestion: SearchSuggestion) => void
  onSelectHistory: (query: string) => void
  onRemoveHistory: (query: string) => void
  onClearHistory: () => void
  onClose: () => void
}

// Подсказки под строкой поиска и перехват нажатий вокруг неё, пока в ней
// фокус. Само затемнение рисует SearchHeader — под строкой, как подложка
// сайта (fixed z-50 под формой z-100): слой лежит поверх всего экрана, и
// затемнение здесь закрыло бы строку. Строка живёт в шапке ленты, а нажатие
// по странице должно закрывать поиск на весь экран, поэтому слой рисуется
// поверх экрана (Portal), а строку обходит: нажатия ловят четыре прозрачные
// части вокруг неё, и поле остаётся живым — с фокусом и клавиатурой.
export function SearchFocusLayer({
  isActive,
  bar,
  field,
  suggestions,
  history,
  isHistoryShown,
  onSelect,
  onSelectHistory,
  onRemoveHistory,
  onClearHistory,
  onClose
}: SearchFocusLayerProps) {
  const rootRef = useRef<View>(null)
  // Где сам слой в окне: координаты строки переводим в его систему.
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null)
  const textColor = useThemeColor('--color-gray-950')
  const mutedColor = useThemeColor('--color-gray-500')

  const measureOrigin = () => rootRef.current?.measureInWindow((x, y) => setOrigin({ x, y }))

  const top = origin && bar ? bar.y - origin.y : 0
  const left = origin && bar ? bar.x - origin.x : 0
  const bottom = top + (bar?.height ?? 0)
  // Подсказки и история выпадают под полем на его ширину.
  const dropdownStyle =
    origin && field
      ? { top: field.y - origin.y + field.height + 4, left: field.x - origin.x, width: field.width }
      : undefined

  return (
    <View
      ref={rootRef}
      onLayout={measureOrigin}
      pointerEvents='box-none'
      className={`absolute inset-0 ${isActive ? 'flex' : 'hidden'}`}
    >
      {origin && bar && field && (
        <>
          <Pressable
            accessibilityLabel='Закрыть поиск'
            onPress={onClose}
            className='absolute'
            style={{ top: 0, left: 0, right: 0, height: top }}
          />
          <Pressable
            accessible={false}
            onPress={onClose}
            className='absolute'
            style={{ top, left: 0, width: left, height: bar.height }}
          />
          <Pressable
            accessible={false}
            onPress={onClose}
            className='absolute'
            style={{ top, left: left + bar.width, right: 0, height: bar.height }}
          />
          <Pressable
            accessible={false}
            onPress={onClose}
            className='absolute'
            style={{ top: bottom, left: 0, right: 0, bottom: 0 }}
          />

          {suggestions.length > 0 && (
            <View
              className='absolute max-h-64 overflow-hidden rounded-xl bg-white shadow-lg dark:bg-neutral-800'
              style={dropdownStyle}
            >
              <ScrollView keyboardShouldPersistTaps='handled' contentContainerClassName='py-2'>
                {suggestions.map(suggestion => (
                  <Pressable
                    key={`${suggestion.type}-${suggestion.id}`}
                    accessibilityRole='link'
                    onPress={() => onSelect(suggestion)}
                    className='flex-row items-center gap-3 px-4 py-3 active:bg-gray-50'
                  >
                    {suggestion.type !== 'category' && <Search size={16} color={textColor} />}
                    <View className='flex-1 flex-row flex-wrap items-center gap-1'>
                      <Text className='text-base font-medium text-gray-950'>{suggestion.name}</Text>
                      <ChevronRight size={16} color={mutedColor} />
                      {suggestion.type === 'category' && suggestion.parentName && (
                        <Text className='text-base text-gray-500'>{suggestion.parentName}</Text>
                      )}
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* История смонтирована всегда, показывается только под пустым полем. */}
          <View
            className={`absolute max-h-80 overflow-hidden rounded-xl bg-white shadow-lg dark:bg-neutral-700 ${
              isHistoryShown && history.length > 0 ? 'flex' : 'hidden'
            }`}
            style={dropdownStyle}
          >
            <View className='flex-row items-center justify-between px-4 pt-3 pb-1'>
              <Text className='text-sm font-medium text-gray-500'>Вы искали</Text>
              <Pressable accessibilityRole='button' onPress={onClearHistory} hitSlop={8}>
                <Text className='text-sm font-medium text-primary'>Очистить</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps='handled' contentContainerClassName='pb-2'>
              {history.map(item => (
                <Pressable
                  key={item}
                  accessibilityRole='link'
                  onPress={() => onSelectHistory(item)}
                  className='flex-row items-center gap-3 pl-4 active:bg-gray-50'
                >
                  <Clock size={16} color={mutedColor} />
                  <Text numberOfLines={1} className='flex-1 py-3 text-base text-gray-950'>
                    {item}
                  </Text>
                  <Pressable
                    accessibilityRole='button'
                    accessibilityLabel={`Удалить запрос «${item}»`}
                    onPress={() => onRemoveHistory(item)}
                    className='h-11 justify-center px-4'
                  >
                    <X size={16} color={mutedColor} />
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  )
}
