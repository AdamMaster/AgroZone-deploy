import type { PropsWithChildren } from 'react'
import { Modal, Pressable, ScrollView, useWindowDimensions } from 'react-native'

import { useModalInsets } from '@/shared/hooks/use-modal-insets'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  // Панель закрылась полностью (только iOS) — см. ActionSheet.
  onDismiss?: () => void
}

// Панель снизу экрана поверх затемнения — основа для выбора варианта и
// меню действий. Длинное содержимое прокручивается.
export function BottomSheet({ visible, onClose, onDismiss, children }: PropsWithChildren<BottomSheetProps>) {
  const { bottom } = useModalInsets()
  const { height } = useWindowDimensions()

  return (
    <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose} onDismiss={onDismiss}>
      <Pressable accessibilityLabel='Закрыть' className='flex-1 bg-black/20' onPress={onClose} />
      <ScrollView
        className='rounded-t-2xl bg-background'
        // flexGrow: 0 стилем, а не классом: у ScrollView свой flexGrow: 1 по
        // умолчанию, и панель растягивалась бы на пол-экрана при паре пунктов.
        style={{ flexGrow: 0, maxHeight: height * 0.6 }}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: bottom + 8 }}
      >
        {children}
      </ScrollView>
    </Modal>
  )
}
