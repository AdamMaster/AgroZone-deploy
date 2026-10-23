import * as Haptics from 'expo-haptics'
import { memo } from 'react'
import { Pressable, Text, View } from 'react-native'

import { AdPhoto } from '@/shared/components/ad-photo'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ImageIcon } from '@/shared/icons/lucide'
import { formatMessageTime } from '@/shared/utils/date'

import { getMessagePreview } from '../lib/message-preview'
import type { ConversationListItem as Conversation } from '../types/message.types'

const MENU_ACTION = 'more'

interface ConversationListItemProps {
  conversation: Conversation
  onOpen: (conversation: Conversation) => void
  onOpenMenu: (conversation: Conversation) => void
}

// Строка диалога — как ConversationListItem сайта на телефоне: фото
// объявления, собеседник, время и точка непрочитанного, объявление,
// последнее сообщение. Меню (заблокировать или удалить переписку) вызывается
// долгим нажатием на строку, как в мессенджерах: действия редкие, и держать
// для них кнопку на каждой строке незачем — она ещё и отнимала место у
// превью сообщения. Открытие меню подтверждается вибрацией. Для скринридеров
// то же меню доступно как отдельное действие (accessibilityActions), чтобы оно
// не зависело от жеста.
export const ConversationListItem = memo(function ConversationListItem({
  conversation,
  onOpen,
  onOpenMenu
}: ConversationListItemProps) {
  const { ad, counterpart, lastMessage, isUnread } = conversation
  const isDeleted = !!counterpart.deletedAt
  const iconColor = useThemeColor('--color-gray-400')
  const name = isDeleted ? 'Пользователь удалил аккаунт' : (counterpart.displayName ?? 'Пользователь')

  const handleLongPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onOpenMenu(conversation)
  }

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={`${isUnread ? 'Есть новые сообщения. ' : ''}${name}, ${ad.title}`}
      accessibilityActions={[{ name: MENU_ACTION, label: 'Заблокировать или удалить переписку' }]}
      onAccessibilityAction={event => {
        if (event.nativeEvent.actionName === MENU_ACTION) onOpenMenu(conversation)
      }}
      onPress={() => onOpen(conversation)}
      onLongPress={handleLongPress}
      className='items flex-row gap-3 border-gray-100 py-2 active:bg-gray-50'
    >
      <View className='size-15 items-center justify-center overflow-hidden rounded-lg bg-gray-100'>
        {ad.images[0] ? (
          <AdPhoto url={ad.images[0]} size={400} className='size-full' contentFit='cover' />
        ) : (
          <ImageIcon size={20} color={iconColor} />
        )}
      </View>

      <View className='min-w-0 flex-1'>
        <View className='flex-row items-start justify-between gap-2'>
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
          <Text numberOfLines={1} className={`text-sm ${isUnread ? 'text-gray-900' : 'text-gray-400'}`}>
            {getMessagePreview(lastMessage)}
          </Text>
        )}
      </View>
    </Pressable>
  )
})
