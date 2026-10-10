import { Pressable, ScrollView, Text, View } from 'react-native'

import type { SheetOption } from './options-sheet'

export interface LineTab<T extends string> extends SheetOption<T> {
  // Число в кружке справа от подписи (например, объявлений во вкладке).
  count?: number
}

interface LineTabsProps<T extends string> {
  value: T
  tabs: readonly LineTab<T>[]
  onChange: (value: T) => void
  // Вкладок больше, чем помещается в ширину экрана, — листаются вбок.
  isScrollable?: boolean
}

// Подчёркивание активной вкладки выступает под её нижний край — как у Tabs
// сайта; в прокрутке под него нужен запас, иначе оно обрежется.
const UNDERLINE_OFFSET = 5

// Вкладки с подчёркиванием активной — как Tabs variant='line' сайта.
export function LineTabs<T extends string>({ value, tabs, onChange, isScrollable = false }: LineTabsProps<T>) {
  const list = (
    <View accessibilityRole='tablist' className='flex-row gap-4'>
      {tabs.map(tab => {
        const isActive = tab.value === value

        return (
          <Pressable
            key={tab.value}
            accessibilityRole='tab'
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.count === undefined ? tab.label : `${tab.label}: ${tab.count}`}
            onPress={() => onChange(tab.value)}
            className='h-7 flex-row items-center gap-1.5'
            hitSlop={8}
          >
            <Text className={`text-base font-medium ${isActive ? 'text-foreground' : 'text-foreground/60'}`}>
              {tab.label}
            </Text>
            {tab.count !== undefined && (
              <View className='size-4.5 items-center justify-center rounded-full bg-gray-200'>
                <Text className='text-xs leading-none font-medium text-gray-950'>{tab.count}</Text>
              </View>
            )}
            <View
              className={`absolute right-0 left-0 h-0.5 ${isActive ? 'bg-foreground' : ''}`}
              style={{ bottom: -UNDERLINE_OFFSET }}
            />
          </Pressable>
        )
      })}
    </View>
  )

  if (!isScrollable) return list

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: UNDERLINE_OFFSET }}
    >
      {list}
    </ScrollView>
  )
}
