import type { PropsWithChildren, ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { X } from '@/shared/icons/lucide'

import { Heading } from './heading'

interface DialogProps {
  visible: boolean
  onClose: () => void
  title: string
  description?: ReactNode
}

// Окно по центру экрана поверх затемнения — как Dialog сайта: заголовок,
// пояснение, содержимое и крестик. Клавиатура не закрывает поля внутри.
export function Dialog({ visible, onClose, title, description, children }: PropsWithChildren<DialogProps>) {
  const closeIconColor = useThemeColor('--color-gray-500')

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className='flex-1 items-center justify-center bg-black/40 px-4'
      >
        <Pressable accessibilityLabel='Закрыть' className='absolute inset-0' onPress={onClose} />
        <View className='w-full max-w-100 gap-4 rounded-xl bg-background p-6'>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Закрыть'
            onPress={onClose}
            hitSlop={8}
            className='absolute top-3 right-3 z-10 size-7 items-center justify-center'
          >
            <X size={16} color={closeIconColor} />
          </Pressable>
          <View className='gap-2 pr-6'>
            <Heading level={4}>{title}</Heading>
            {description && <Text className='text-sm text-gray-500'>{description}</Text>}
          </View>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
