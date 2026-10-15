import { useRouter } from 'expo-router'
import { View } from 'react-native'

import { ScreenMessage } from '@/shared/components/screen-message'

// Маршрут, которого нет в приложении (устаревшая ссылка, неверный адрес):
// тот же текст и действие, что у NotFoundContent сайта.
export default function NotFoundScreen() {
  const router = useRouter()

  return (
    <View className='flex-1 bg-background'>
      <ScreenMessage
        title='Страница не найдена'
        description='Такой страницы не существует или она была удалена.'
        action={{ title: 'На главную', onPress: () => router.replace('/') }}
      />
    </View>
  )
}
