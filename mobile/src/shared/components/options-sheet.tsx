import { Modal, Pressable, ScrollView, Text, useWindowDimensions } from 'react-native'

import { useModalInsets } from '@/shared/hooks/use-modal-insets'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Check } from '@/shared/icons/lucide'

export interface SheetOption<T extends string> {
  value: T
  label: string
}

interface OptionsSheetProps<T extends string> {
  visible: boolean
  options: readonly SheetOption<T>[]
  selected: T | undefined
  onSelect: (value: T) => void
  onClose: () => void
}

// Выпадающий список вариантов — на телефоне снизу экрана (так выглядят
// Select сайта на мобильных). Длинный список (годы выпуска) прокручивается.
export function OptionsSheet<T extends string>({
  visible,
  options,
  selected,
  onSelect,
  onClose
}: OptionsSheetProps<T>) {
  const { bottom } = useModalInsets()
  const { height } = useWindowDimensions()
  const primaryColor = useThemeColor('--color-primary')

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <Pressable accessibilityLabel='Закрыть' className='flex-1 bg-black/20' onPress={onClose} />
      <ScrollView
        className='grow-0 rounded-t-2xl bg-background'
        style={{ maxHeight: height * 0.6 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: bottom + 8 }}
      >
        {options.map(option => {
          const isSelected = option.value === selected

          return (
            <Pressable
              key={option.value}
              accessibilityRole='radio'
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(option.value)}
              className='flex-row items-center justify-between px-4 py-3.5 active:bg-gray-50'
            >
              <Text className='text-[15px] text-gray-950'>{option.label}</Text>
              {isSelected && <Check size={18} color={primaryColor} />}
            </Pressable>
          )
        })}
      </ScrollView>
    </Modal>
  )
}
