import { Pressable, Text } from 'react-native'

import { useSheetAction } from '@/shared/hooks/use-sheet-action'

import { BottomSheet } from './bottom-sheet'

export interface SheetAction {
  key: string
  label: string
  onPress: () => void
  // Необратимое действие («Удалить», «Пожаловаться») — красным, как на сайте.
  isDestructive?: boolean
  isDisabled?: boolean
}

interface ActionSheetProps {
  visible: boolean
  actions: readonly SheetAction[]
  onClose: () => void
}

// Меню действий снизу экрана — как выпадающее меню «Ещё» (…) сайта.
export function ActionSheet({ visible, actions, onClose }: ActionSheetProps) {
  const { runAction, onDismiss } = useSheetAction(onClose)

  return (
    <BottomSheet visible={visible} onClose={onClose} onDismiss={onDismiss}>
      {actions.map(action => (
        <Pressable
          key={action.key}
          accessibilityRole='button'
          accessibilityState={{ disabled: action.isDisabled }}
          disabled={action.isDisabled}
          onPress={() => runAction(action.onPress)}
          className='px-4 py-3.5 active:bg-gray-50 disabled:opacity-50'
        >
          <Text className={`text-[15px] ${action.isDestructive ? 'text-red-500' : 'text-gray-950'}`}>
            {action.label}
          </Text>
        </Pressable>
      ))}
    </BottomSheet>
  )
}
