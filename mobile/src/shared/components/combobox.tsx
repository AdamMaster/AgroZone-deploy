import { useEffect, useId, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, type TextInput, View } from 'react-native'

import { useFormScroll } from './form-scroll-view'
import { Input } from './input'

export interface ComboboxItem {
  key: string
  label: string
}

interface ComboboxProps<T extends ComboboxItem> {
  text: string
  onChangeText: (text: string) => void
  // Варианты для текущего текста — фильтрует вызывающий: где-то это поиск
  // по готовому списку, где-то — запрос подсказок на сервер.
  items: readonly T[]
  onSelect: (item: T) => void
  placeholder: string
  accessibilityLabel: string
  emptyText: string
  isLoading?: boolean
}

const BLUR_CLOSE_DELAY_MS = 200

// Поле с выпадающим списком вариантов — как поля на cmdk сайта (категория,
// локация, адрес): в фокусе под полем раскрывается список, выбор
// закрывает его.
//
// Список стоит в потоке формы, а не поверх неё: внутри прокрутки
// абсолютно спозиционированный список обрезался бы границами и не
// принимал касания на Android.
export function Combobox<T extends ComboboxItem>({
  text,
  onChangeText,
  items,
  onSelect,
  placeholder,
  accessibilityLabel,
  emptyText,
  isLoading = false
}: ComboboxProps<T>) {
  const key = useId()
  const containerRef = useRef<View>(null)
  const inputRef = useRef<TextInput>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [isOpen, setIsOpen] = useState(false)
  const { expand, collapse } = useFormScroll()

  useEffect(() => {
    if (!isOpen) return

    expand(key, containerRef.current)
    // Закрылся список или поле исчезло из формы (сменилась вкладка).
    return () => collapse(key)
  }, [isOpen, key, expand, collapse])

  useEffect(() => () => clearTimeout(closeTimerRef.current), [])

  const open = () => {
    clearTimeout(closeTimerRef.current)
    setIsOpen(true)
  }

  // Закрываем не сразу, а чуть позже — как сайт: в браузере (и в
  // веб-сборке приложения) поле теряет фокус раньше, чем срабатывает
  // нажатие на вариант, и мгновенно убранный список «съел» бы выбор.
  const closeLater = () => {
    clearTimeout(closeTimerRef.current)
    closeTimerRef.current = setTimeout(() => setIsOpen(false), BLUR_CLOSE_DELAY_MS)
  }

  const select = (item: T) => {
    clearTimeout(closeTimerRef.current)
    setIsOpen(false)
    inputRef.current?.blur()
    onSelect(item)
  }

  return (
    <View ref={containerRef} className='gap-2.5'>
      <Input
        ref={inputRef}
        value={text}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={accessibilityLabel}
        autoCorrect={false}
        returnKeyType='done'
        onFocus={open}
        onBlur={closeLater}
      />

      {isOpen && (
        <View className='max-h-64 overflow-hidden rounded-lg border border-border bg-white shadow-md dark:bg-[#212121]'>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps='handled' contentContainerClassName='py-2'>
            {items.map(item => (
              <Pressable
                key={item.key}
                accessibilityRole='button'
                onPress={() => select(item)}
                className='px-3.5 py-2 active:bg-gray-50 dark:active:bg-neutral-800'
              >
                <Text className='text-base text-gray-950'>{item.label}</Text>
              </Pressable>
            ))}
            {items.length === 0 &&
              (isLoading ? (
                <ActivityIndicator className='py-4' colorClassName='accent-gray-500' />
              ) : (
                <Text className='px-3.5 py-4 text-center text-sm text-gray-500'>{emptyText}</Text>
              ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}
