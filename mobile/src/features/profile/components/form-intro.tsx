import { Text } from 'react-native'

// Пояснение под заголовком окна настроек — как description у
// UserFormWrapper сайта (заголовок здесь — в шапке окна).
export function FormIntro({ children }: { children: string }) {
  return <Text className='mb-6 text-base text-gray-500'>{children}</Text>
}
