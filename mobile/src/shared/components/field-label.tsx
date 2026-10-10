import type { ReactNode } from 'react'
import { Text } from 'react-native'

// Подпись поля — как Label сайта: мелкий полужирный текст над полем.
export function FieldLabel({ children }: { children: ReactNode }) {
  return <Text className='mb-2.5 text-sm leading-none font-medium text-gray-900 dark:text-white'>{children}</Text>
}
