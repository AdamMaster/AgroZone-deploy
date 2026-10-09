import { Text, View } from 'react-native'

// Веб-сборка приложения нужна только для проверки вёрстки — встроенного
// браузера для капчи в ней нет.
export function CaptchaWebView(_props: { onToken: (token: string) => void; onError: () => void }) {
  return (
    <View className='flex-1 items-center justify-center p-6'>
      <Text className='text-center text-muted-foreground'>Капча доступна только в приложении на телефоне</Text>
    </View>
  )
}
