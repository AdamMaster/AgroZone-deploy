import { useState } from 'react'
import { Pressable, Text } from 'react-native'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ChevronDown } from '@/shared/icons/lucide'

import { OptionsSheet, type SheetOption } from './options-sheet'

interface SelectFieldProps<T extends string> {
  value: T | undefined
  options: readonly SheetOption<T>[]
  onChange: (value: T) => void
  accessibilityLabel: string
  // Текст, пока ничего не выбрано (или выбран вариант без подписи).
  placeholder?: string
  // 'sm' — компактный (радиус в фильтре), как h-9 у сайта.
  size?: 'default' | 'sm'
  // fit — по содержимому; full — на всю ширину колонки; flex — поровну с
  // соседними полями в ряду («От» и «До»).
  width?: 'fit' | 'full' | 'flex'
}

const WIDTH_CLASSES = { fit: 'self-start', full: 'self-stretch', flex: 'flex-1' } as const

// Поле выбора — как SelectTrigger сайта: серое поле с текущим значением и
// стрелкой; варианты открываются снизу экрана.
export function SelectField<T extends string>({
  value,
  options,
  onChange,
  accessibilityLabel,
  placeholder,
  size = 'default',
  width = 'fit'
}: SelectFieldProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const iconColor = useThemeColor('--color-gray-500')
  const label = options.find(option => option.value === value)?.label

  const select = (next: T) => {
    setIsOpen(false)
    if (next !== value) onChange(next)
  }

  return (
    <>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel={`${accessibilityLabel}: ${label ?? placeholder ?? ''}`}
        onPress={() => setIsOpen(true)}
        className={`flex-row items-center justify-between gap-1.5 rounded-lg border border-border bg-gray-50 active:bg-gray-100 ${
          size === 'sm' ? 'h-9 px-3' : 'h-11 px-4'
        } ${WIDTH_CLASSES[width]}`}
      >
        <Text className={`text-sm ${label ? 'text-gray-950' : 'text-gray-500'}`} numberOfLines={1}>
          {label ?? placeholder}
        </Text>
        <ChevronDown size={16} color={iconColor} />
      </Pressable>

      <OptionsSheet
        visible={isOpen}
        options={options}
        selected={value}
        onSelect={select}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
