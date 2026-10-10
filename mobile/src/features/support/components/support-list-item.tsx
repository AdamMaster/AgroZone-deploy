import { Pressable, Text, View } from 'react-native'

import { Headset } from '@/shared/icons/lucide'

import { useSupportChatStore } from '../store/support-chat-store'

interface SupportListItemProps {
  // Администратору вместо собственного тикета — входящие обращения.
  isAdmin: boolean
  onPress: () => void
}

// Закреплённая строка над диалогами: чат с поддержкой — как
// SupportConversationListItem сайта.
export function SupportListItem({ isAdmin, onPress }: SupportListItemProps) {
  const hasUnread = useSupportChatStore(state => state.hasUnread)

  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      className='flex-row items-center gap-3 border-b border-gray-100 py-2 active:bg-gray-100'
    >
      <View className='size-15 items-center justify-center rounded-lg bg-primary'>
        <Headset size={24} color='#ffffff' />
      </View>
      <View className='min-w-0 flex-1'>
        <Text className='text-base leading-5 font-semibold text-gray-900'>
          {isAdmin ? 'Обращения в поддержку' : 'Поддержка AgroZone'}
        </Text>
        <Text numberOfLines={1} className='text-sm text-gray-500'>
          {isAdmin ? 'Вопросы пользователей и гостей' : 'Задайте вопрос по работе площадки'}
        </Text>
      </View>
      {hasUnread && <View accessibilityLabel='Есть новые сообщения' className='size-2 rounded-full bg-primary' />}
    </Pressable>
  )
}
