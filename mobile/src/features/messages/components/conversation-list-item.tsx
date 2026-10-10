import { memo } from 'react'
import { Pressable, Text, View } from 'react-native'

import { AdPhoto } from '@/shared/components/ad-photo'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Ellipsis, ImageIcon } from '@/shared/icons/lucide'
import { formatMessageTime } from '@/shared/utils/date'

import type { ConversationListItem as Conversation } from '../types/message.types'

interface ConversationListItemProps {
  conversation: Conversation
  onOpen: (conversation: Conversation) => void
  onOpenMenu: (conversation: Conversation) => void
}

// Строка диалога — как ConversationListItem сайта на телефоне: фото
// объявления, собеседник, время и точка непрочитанного, объявление,
// последнее сообщение; «…» — заблокировать или удалить переписку.
export const ConversationListItem = memo(function ConversationListItem({
  conversation,
  onOpen,
  onOpenMenu
}: ConversationListItemProps) {
  const { ad, counterpart, lastMessage, isUnread } = conversation
  const isDeleted = !!counterpart.deletedAt
  const iconColor = useThemeColor('--color-gray-400')
  const menuIconColor = useThemeColor('--color-gray-700')
  const name = isDeleted ? 'Пользователь удалил аккаунт' : (counterpart.displayName ?? 'Пользователь')

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={`${isUnread ? 'Есть новые сообщения. ' : ''}${name}, ${ad.title}`}
      onPress={() => onOpen(conversation)}
      className='flex-row items-center gap-3 border-b border-gray-100 py-2 active:bg-gray-100'
    >
      <View className='size-15 items-center justify-center overflow-hidden rounded-lg bg-gray-100'>
        {ad.images[0] ? (
          <AdPhoto url={ad.images[0]} size={400} className='size-full' contentFit='cover' />
        ) : (
          <ImageIcon size={20} color={iconColor} />
        )}
      </View>

      <View className='min-w-0 flex-1'>
        <View className='flex-row items-center justify-between gap-2'>
          <Text
            numberOfLines={1}
            className={`flex-1 text-base leading-5 font-semibold ${isDeleted ? 'text-gray-400' : 'text-gray-900'}`}
          >
            {name}
          </Text>
          {lastMessage && (
            <View className='flex-row items-center gap-3'>
              <Text className='text-xs text-gray-400'>{formatMessageTime(lastMessage.createdAt)}</Text>
              {isUnread && <View className='size-2 rounded-full bg-primary' />}
            </View>
          )}
        </View>
        <Text numberOfLines={1} className='text-sm text-gray-900'>
          {ad.title}
        </Text>
        {lastMessage && (
          <Text numberOfLines={1} className={`pr-12 text-sm ${isUnread ? 'text-gray-900' : 'text-gray-400'}`}>
            {lastMessage.text}
          </Text>
        )}
      </View>

      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Ещё'
        hitSlop={4}
        onPress={() => onOpenMenu(conversation)}
        className='absolute right-3 bottom-3 size-9 items-center justify-center rounded-lg bg-white active:bg-gray-100 dark:bg-neutral-800'
      >
        <Ellipsis size={20} color={menuIconColor} />
      </Pressable>
    </Pressable>
  )
})
