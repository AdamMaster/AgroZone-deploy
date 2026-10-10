import { useCallback, useEffect } from 'react'

import { useProfile } from '@/features/auth/hooks/use-profile'

import {
  useConversation,
  useConversationMessages,
  useMarkConversationRead,
  useSendConversationMessage
} from '../hooks/use-conversations'
import type { ChatMessage } from '../types/message.types'
import { ChatHeader } from './chat-header'
import { ChatLayout } from './chat-layout'
import { MessageComposer } from './message-composer'
import { MessageThread } from './message-thread'

// Переписка по объявлению — ExistingConversation сайта.
export function ConversationChatScreen({ conversationId }: { conversationId: string }) {
  const { data: profile } = useProfile()
  const { conversation, isPending: isConversationPending } = useConversation(conversationId)
  const history = useConversationMessages(conversationId)
  const { mutateAsync: sendMessage, isPending: isSending } = useSendConversationMessage(conversationId)
  const { mutate: markRead } = useMarkConversationRead()
  const lastMessageId = history.messages?.at(-1)?.id

  // Диалог на экране — всё, что в нём есть, прочитано: при открытии и при
  // каждом новом сообщении.
  useEffect(() => {
    if (lastMessageId) markRead(conversationId)
  }, [conversationId, lastMessageId, markRead])

  const userId = profile?.id
  const isOwnMessage = useCallback((message: ChatMessage) => message.senderId === userId, [userId])
  const counterpart = conversation?.counterpart

  const send = (text: string) =>
    sendMessage(text).then(
      () => true,
      () => false
    )

  return (
    <ChatLayout
      header={<ChatHeader counterpart={counterpart} ad={conversation?.ad} isLoading={isConversationPending} />}
      thread={
        <MessageThread
          messages={history.messages}
          error={history.error}
          onRetry={() => void history.refetch()}
          isOwnMessage={isOwnMessage}
          counterpart={counterpart}
          emptyText='Сообщений пока нет'
          hasOlder={history.hasOlder}
          isLoadingOlder={history.isLoadingOlder}
          onLoadOlder={() => void history.loadOlder()}
        />
      }
      composer={<MessageComposer onSend={send} isSending={isSending} />}
    />
  )
}
