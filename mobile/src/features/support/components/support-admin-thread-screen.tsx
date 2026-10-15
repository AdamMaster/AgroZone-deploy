import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable } from 'react-native'

import { ChatHeader } from '@/features/messages/components/chat-header'
import { ChatLayout } from '@/features/messages/components/chat-layout'
import { MessageComposer } from '@/features/messages/components/message-composer'
import { MessageThread } from '@/features/messages/components/message-thread'
import type { ChatMessage } from '@/features/messages/types/message.types'

import { ActionSheet } from '@/shared/components/action-sheet'
import { ScreenMessage } from '@/shared/components/screen-message'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Ellipsis } from '@/shared/icons/lucide'

import {
  useClearSupportAdminMessages,
  useDeleteSupportAdminMessage,
  useMarkSupportAdminRead,
  useSendSupportAdminMessage,
  useSupportAdminConversation,
  useSupportAdminMessages
} from '../hooks/use-support-admin'
import { describeParticipant, isSupportSideMessage } from '../lib/participant'
import { useSupportChatStore } from '../store/support-chat-store'
import { SupportAdminClearDialog } from './support-admin-clear-dialog'
import { SupportParticipantAvatar } from './support-participant-avatar'

// Переписка администратора с обращением — SupportAdminThread сайта: можно
// ответить, удалить отдельное сообщение или всю историю.
export function SupportAdminThreadScreen({ conversationId }: { conversationId: string }) {
  const { conversation, isPending, error, refetch } = useSupportAdminConversation(conversationId)
  const history = useSupportAdminMessages(conversationId)
  const { mutateAsync: sendMessage, isPending: isSending } = useSendSupportAdminMessage(conversationId)
  const { mutate: markRead } = useMarkSupportAdminRead()
  const { mutate: deleteMessage } = useDeleteSupportAdminMessage(conversationId)
  const { mutate: clearMessages, isPending: isClearing } = useClearSupportAdminMessages(conversationId)
  const setAdminView = useSupportChatStore(state => state.setAdminView)
  const leaveAdminView = useSupportChatStore(state => state.leaveAdminView)
  const menuIconColor = useThemeColor('--color-gray-900')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isClearOpen, setIsClearOpen] = useState(false)
  const lastMessageId = history.messages?.at(-1)?.id
  const participant = conversation?.participant

  // Обращение открыто — пришедшие в него сообщения сразу прочитаны.
  useFocusEffect(
    useCallback(() => {
      setAdminView(conversationId)
      return () => leaveAdminView(conversationId)
    }, [conversationId, setAdminView, leaveAdminView])
  )

  useFocusEffect(
    useCallback(() => {
      if (lastMessageId) markRead(conversationId)
    }, [conversationId, lastMessageId, markRead])
  )

  const isOwnMessage = useCallback(
    (message: ChatMessage) => !!participant && isSupportSideMessage(participant, message),
    [participant]
  )

  const send = (text: string) =>
    sendMessage(text).then(
      () => true,
      () => false
    )

  const clear = () =>
    clearMessages(undefined, {
      onSuccess: () => setIsClearOpen(false)
    })

  // Обращения нет в списке: его убрали («Удалить чат», в том числе с другого
  // устройства) или список не загрузился.
  if (!participant) {
    return (
      <ChatLayout
        header={<ChatHeader isLoading={isPending} />}
        thread={
          isPending ? null : error ? (
            <ScreenMessage
              title='Не удалось загрузить обращение'
              description={error.message}
              action={{ title: 'Повторить', onPress: () => void refetch() }}
            />
          ) : (
            <ScreenMessage title='Обращение не найдено' description='Возможно, оно было удалено из списка.' />
          )
        }
      />
    )
  }

  const hasMessages = !!history.messages?.length

  return (
    <ChatLayout
      header={
        <ChatHeader
          counterpart={{
            id: participant.id,
            displayName: describeParticipant(participant),
            picture: null
          }}
          avatar={<SupportParticipantAvatar participant={participant} />}
          trailing={
            <Pressable
              accessibilityRole='button'
              accessibilityLabel='Действия с перепиской'
              onPress={() => setIsMenuOpen(true)}
              className='size-10 items-center justify-center rounded-lg active:bg-gray-200'
            >
              <Ellipsis size={20} color={menuIconColor} />
            </Pressable>
          }
        />
      }
      thread={
        <>
          <MessageThread
            messages={history.messages}
            error={history.error}
            onRetry={() => void history.refetch()}
            isOwnMessage={isOwnMessage}
            emptyText='Сообщений пока нет'
            onDeleteMessage={deleteMessage}
            hasOlder={history.hasOlder}
            isLoadingOlder={history.isLoadingOlder}
            onLoadOlder={() => void history.loadOlder()}
          />
          <ActionSheet
            visible={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            actions={[
              {
                key: 'clear',
                label: 'Удалить все сообщения',
                isDestructive: true,
                isDisabled: !hasMessages || isClearing,
                onPress: () => setIsClearOpen(true)
              }
            ]}
          />
          <SupportAdminClearDialog
            visible={isClearOpen}
            isClearing={isClearing}
            onConfirm={clear}
            onClose={() => setIsClearOpen(false)}
          />
        </>
      }
      composer={<MessageComposer onSend={send} isSending={isSending} placeholder='Ответить...' />}
    />
  )
}
