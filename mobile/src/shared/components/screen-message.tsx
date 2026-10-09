import { Text, View } from 'react-native'

import { Button } from './button'

interface ScreenMessageProps {
  title: string
  description?: string
  action?: { title: string; onPress: () => void }
}

// Сообщение на весь экран (или на всю область списка): ошибка загрузки,
// пустой результат. Действие — обычно «Повторить».
export function ScreenMessage({ title, description, action }: ScreenMessageProps) {
  return (
    <View className='flex-1 items-center justify-center gap-3 px-8 py-16'>
      <Text className='text-center text-lg font-semibold text-foreground'>{title}</Text>
      {description && <Text className='text-center text-sm text-muted-foreground'>{description}</Text>}
      {action && (
        <View className='mt-2'>
          <Button title={action.title} onPress={action.onPress} />
        </View>
      )}
    </View>
  )
}
