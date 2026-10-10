import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

interface SettingsCardProps {
  label: string
  description: string
  // Справа от подписи (переключатель, кнопка) или под ней (варианты темы).
  action?: ReactNode
  children?: ReactNode
}

// Серая карточка настройки — как Field с рамкой в разделах «Безопасность»
// и «Персонализация» сайта.
export function SettingsCard({ label, description, action, children }: SettingsCardProps) {
  return (
    <View className='gap-3 rounded-lg border border-border bg-gray-50 p-4'>
      <View className='flex-row items-center justify-between gap-4'>
        <View className='flex-1 gap-2.5'>
          <Text className='text-sm leading-none font-medium text-gray-900'>{label}</Text>
          <Text className='text-xs leading-normal text-gray-500'>{description}</Text>
        </View>
        {action}
      </View>
      {children}
    </View>
  )
}
