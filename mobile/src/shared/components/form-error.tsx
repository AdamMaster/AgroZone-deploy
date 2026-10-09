import { Text, View } from 'react-native'

interface FormErrorProps {
  message?: string | null
}

// Ошибка всей формы (ответ сервера), в отличие от ошибок отдельных полей.
export function FormError({ message }: FormErrorProps) {
  if (!message) return null

  return (
    <View className='rounded-xl bg-destructive/10 px-4 py-3' accessibilityLiveRegion='polite' accessibilityRole='alert'>
      <Text className='text-sm text-destructive'>{message}</Text>
    </View>
  )
}
