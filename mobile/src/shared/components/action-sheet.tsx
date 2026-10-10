import { useRef } from 'react'
import { Platform, Pressable, Text } from 'react-native'

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
//
// Действие часто открывает своё окно (жалоба, «Поделиться»), а iOS не
// покажет новое окно, пока меню ещё закрывается, — там действие выполняем
// после полного закрытия меню (onDismiss). На Android окна открываются
// друг за другом без ожидания.
export function ActionSheet({ visible, actions, onClose }: ActionSheetProps) {
  const pendingActionRef = useRef<SheetAction | null>(null)

  const select = (action: SheetAction) => {
    onClose()

    if (Platform.OS === 'ios') {
      pendingActionRef.current = action
    } else {
      action.onPress()
    }
  }

  const runPendingAction = () => {
    const action = pendingActionRef.current
    pendingActionRef.current = null
    action?.onPress()
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} onDismiss={runPendingAction}>
      {actions.map(action => (
        <Pressable
          key={action.key}
          accessibilityRole='button'
          accessibilityState={{ disabled: action.isDisabled }}
          disabled={action.isDisabled}
          onPress={() => select(action)}
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
