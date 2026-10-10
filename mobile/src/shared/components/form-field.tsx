import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

interface FormFieldProps {
  // Без подписи — поле с подсказкой внутри (placeholder), как в окнах
  // смены пароля и почты на сайте.
  label?: string
  // Пояснение мелким серым текстом между подписью и полем.
  description?: ReactNode
  error?: string
  children: ReactNode
}

// Поле формы настроек — как Field сайта: подпись, пояснение, само поле и
// ошибка под ним.
export function FormField({ label, description, error, children }: FormFieldProps) {
  return (
    <View className='gap-2'>
      {label && (
        <Text className={`text-sm leading-none font-medium text-gray-900 ${description ? '' : 'mb-1'}`}>{label}</Text>
      )}
      {description && <Text className='mb-1 text-xs leading-normal text-gray-500'>{description}</Text>}
      {children}
      {error && <Text className='text-sm text-destructive'>{error}</Text>}
    </View>
  )
}
