import { useFocusEffect } from 'expo-router'
import { useCallback, useEffect } from 'react'

import { useProfile } from '@/features/auth/hooks/use-profile'
import { ChatHeader } from '@/features/messages/components/chat-header'
import { ChatLayout } from '@/features/messages/components/chat-layout'
import { MessageComposer } from '@/features/messages/components/message-composer'
import { MessageThread } from '@/features/messages/components/message-thread'
import type { ChatMessage } from '@/features/messages/types/message.types'

import { useMarkSupportRead, useSendSupportMessage, useSupportMessages } from '../hooks/use-support-chat'
import { useSupportChatStore } from '../store/support-chat-store'
import { SupportAvatar } from './support-avatar'

const SUPPORT_COUNTERPART = { id: 'support', displayName: 'Поддержка AgroZone', picture: null }

// Чат с поддержкой — SupportParticipantChat сайта. Ответы приходят по
// сокету (useSupportRealtime), поэтому здесь опроса нет.
export function SupportChatScreen() {
  const { data: profile } = useProfile()
  const history = useSupportMessages()
  const { mutateAsync: sendMessage, isPending: isSending } = useSendSupportMessage()
  const { mutate: markRead } = useMarkSupportRead()
  const setChatOpen = useSupportChatStore(state => state.setChatOpen)
  const setHasUnread = useSupportChatStore(state => state.setHasUnread)
  const lastMessageId = history.messages?.at(-1)?.id

  // Пока чат на экране, пришедшие ответы сразу прочитаны.
  useFocusEffect(
    useCallback(() => {
      setChatOpen(true)
      setHasUnread(false)
      return () => setChatOpen(false)
    }, [setChatOpen, setHasUnread])
  )

  useEffect(() => {
    if (lastMessageId) markRead()
  }, [lastMessageId, markRead])

  const userId = profile?.id
  const isOwnMessage = useCallback((message: ChatMessage) => message.senderId === userId, [userId])

  const send = (text: string) =>
    sendMessage(text).then(
      () => true,
      () => false
    )

  return (
    <ChatLayout
      header={<ChatHeader counterpart={SUPPORT_COUNTERPART} avatar={<SupportAvatar />} />}
      thread={
        <MessageThread
          messages={history.messages}
          error={history.error}
          onRetry={() => void history.refetch()}
          isOwnMessage={isOwnMessage}
          emptyText='Напишите нам — мы отвечаем обычно в течение дня'
          hasOlder={history.hasOlder}
          isLoadingOlder={history.isLoadingOlder}
          onLoadOlder={() => void history.loadOlder()}
        />
      }
      composer={<MessageComposer onSend={send} isSending={isSending} placeholder='Опишите вопрос...' />}
    />
  )
}
