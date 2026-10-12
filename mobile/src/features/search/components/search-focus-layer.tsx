import { useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ChevronRight, Search } from '@/shared/icons/lucide'

import type { SearchSuggestion } from '../types/search.types'

// Прямоугольник в координатах окна (measureInWindow).
export interface WindowRect {
  x: number
  y: number
  width: number
  height: number
}

interface SearchFocusLayerProps {
  // Строка поиска с «Отменить» — остаётся над затемнением.
  bar: WindowRect
  // Само поле — под ним, на его ширину, выпадают подсказки.
  field: WindowRect
  suggestions: readonly SearchSuggestion[]
  onSelect: (suggestion: SearchSuggestion) => void
  onClose: () => void
}

const BACKDROP_CLASS = 'absolute bg-black/20'

// Затемнение страницы и подсказки под строкой поиска, пока в ней фокус, —
// как у SearchBar сайта (fixed-подложка под формой с z-100). Строка поиска
// живёт в шапке ленты, а затемнение должно лечь на весь экран, поэтому слой
// рисуется поверх экрана (Portal), а саму строку обходит: подложка
// собирается из четырёх частей вокруг неё, и поле остаётся живым — с фокусом
// и клавиатурой. Под самой строкой то же затемнение даёт SearchHeader.
export function SearchFocusLayer({ bar, field, suggestions, onSelect, onClose }: SearchFocusLayerProps) {
  const rootRef = useRef<View>(null)
  // Где сам слой в окне: координаты строки переводим в его систему.
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null)
  const textColor = useThemeColor('--color-gray-950')
  const mutedColor = useThemeColor('--color-gray-500')

  const measureOrigin = () => rootRef.current?.measureInWindow((x, y) => setOrigin({ x, y }))

  const top = origin ? bar.y - origin.y : 0
  const left = origin ? bar.x - origin.x : 0
  const bottom = top + bar.height

  return (
    <View ref={rootRef} onLayout={measureOrigin} pointerEvents='box-none' className='absolute inset-0'>
      {origin && (
        <>
          <Pressable
            accessibilityLabel='Закрыть поиск'
            onPress={onClose}
            className={BACKDROP_CLASS}
            style={{ top: 0, left: 0, right: 0, height: top }}
          />
          <Pressable
            accessible={false}
            onPress={onClose}
            className={BACKDROP_CLASS}
            style={{ top, left: 0, width: left, height: bar.height }}
          />
          <Pressable
            accessible={false}
            onPress={onClose}
            className={BACKDROP_CLASS}
            style={{ top, left: left + bar.width, right: 0, height: bar.height }}
          />
          <Pressable
            accessible={false}
            onPress={onClose}
            className={BACKDROP_CLASS}
            style={{ top: bottom, left: 0, right: 0, bottom: 0 }}
          />

          {suggestions.length > 0 && (
            <View
              className='absolute max-h-64 overflow-hidden rounded-lg bg-white shadow-lg dark:bg-neutral-700'
              style={{ top: field.y - origin.y + field.height + 4, left: field.x - origin.x, width: field.width }}
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
        </>
      )}
    </View>
  )
}
