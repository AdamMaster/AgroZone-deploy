import { memo } from 'react'
import { Pressable, Text, View } from 'react-native'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Ellipsis } from '@/shared/icons/lucide'
import { formatMessageTime } from '@/shared/utils/date'

import { describeParticipant } from '../lib/participant'
import type { SupportAdminConversation } from '../types/support.types'
import { SupportParticipantAvatar } from './support-participant-avatar'

interface SupportAdminListItemProps {
  conversation: SupportAdminConversation
  onOpen: (conversation: SupportAdminConversation) => void
  onOpenMenu: (conversation: SupportAdminConversation) => void
}

// Строка обращения — SupportAdminConversationListItem сайта: участник,
// время и точка непрочитанного, последнее сообщение; «…» — блокировка гостя
// и удаление обращения из списка.
export const SupportAdminListItem = memo(function SupportAdminListItem({
  conversation,
  onOpen,
  onOpenMenu
}: SupportAdminListItemProps) {
  const { participant, lastMessage, isUnread } = conversation
  const menuIconColor = useThemeColor('--color-gray-700')
  const isBlocked = participant.type === 'guest' && !!participant.blockedAt
  const title = describeParticipant(participant)

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={`${isUnread ? 'Есть новые сообщения. ' : ''}${title}${isBlocked ? ', заблокирован' : ''}`}
      onPress={() => onOpen(conversation)}
      className='flex-row items-center gap-3 border-b border-gray-100 py-2.5 active:bg-gray-100'
    >
      <SupportParticipantAvatar participant={participant} />

      <View className='min-w-0 flex-1'>
        <View className='flex-row items-center justify-between gap-2'>
          <Text
            numberOfLines={1}
            className={`flex-1 text-sm font-semibold ${isBlocked ? 'text-gray-400' : 'text-gray-900'}`}
          >
            {title}
            {isBlocked && ' · заблокирован'}
          </Text>
          {lastMessage && (
            <View className='flex-row items-center gap-2'>
              <Text className='text-xs text-gray-400'>{formatMessageTime(lastMessage.createdAt)}</Text>
              {isUnread && <View className='size-2 rounded-full bg-primary' />}
            </View>
          )}
        </View>
        {lastMessage && (
          <Text numberOfLines={1} className={`pr-8 text-sm ${isUnread ? 'text-gray-900' : 'text-gray-400'}`}>
            {lastMessage.text}
          </Text>
        )}
      </View>

      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Действия'
        hitSlop={6}
        onPress={() => onOpenMenu(conversation)}
        className='size-8 items-center justify-center rounded-lg active:bg-gray-200'
      >
        <Ellipsis size={16} color={menuIconColor} />
      </Pressable>
    </Pressable>
  )
})
