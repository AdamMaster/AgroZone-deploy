'use client'

import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

import { adsService } from '../../ads/services'
import { useConversationMessages, useMarkRead, useSendMessage, useStartConversation } from '../hooks'
import { IConversationListItem } from '../types/message.types'
import { ChatHeader } from './chat-header'
import { MessageComposer } from './message-composer'
import { MessageThread } from './message-thread'

interface ChatPaneProps {
  activeConversationId: string | null
  conversations: IConversationListItem[]
  // adId из ссылки "Написать" на странице объявления — используется, только
  // когда ещё нет ни выбранного, ни существующего диалога по этому
  // объявлению (см. MessagesClient: если диалог уже есть, он подставляется
  // в activeConversationId раньше, чем этот проп вообще понадобится).
  newAdId: string | null
  onStarted: (conversationId: string) => void
  onBack: () => void
}

export const ChatPane = ({ activeConversationId, conversations, newAdId, onStarted, onBack }: ChatPaneProps) => {
  if (activeConversationId) {
    return <ExistingConversation conversationId={activeConversationId} conversations={conversations} onBack={onBack} />
  }

  if (newAdId) {
    return <NewConversation adId={newAdId} onStarted={onStarted} onBack={onBack} />
  }

  // MessagesClient рендерит ChatPane, только когда что-то выбрано — эта
  // ветка недостижима, но оставлена на случай, если вызывающий код когда-то
  // изменится.
  return null
}

interface ExistingConversationProps {
  conversationId: string
  conversations: IConversationListItem[]
  onBack: () => void
}

const ExistingConversation = ({ conversationId, conversations, onBack }: ExistingConversationProps) => {
  const conversation = conversations.find(item => item.id === conversationId)

  const { messages, isLoading } = useConversationMessages(conversationId)
  const { sendMessage, isSending } = useSendMessage(conversationId)
  const { markRead } = useMarkRead()

  // Отмечаем диалог прочитанным при открытии и при получении новых
  // сообщений, пока пользователь на него смотрит.
  useEffect(() => {
    markRead(conversationId)
  }, [conversationId, messages.length, markRead])

  return (
    <div className='flex min-w-0 flex-1 flex-col'>
      <ChatHeader ad={conversation?.ad} counterpart={conversation?.counterpart} onBack={onBack} />
      <MessageThread messages={messages} isLoading={isLoading} counterpart={conversation?.counterpart} />
      <MessageComposer onSend={sendMessage} isSending={isSending} />
    </div>
  )
}

interface NewConversationProps {
  adId: string
  onStarted: (conversationId: string) => void
  onBack: () => void
}

const NewConversation = ({ adId, onStarted, onBack }: NewConversationProps) => {
  // Тот же кэш-ключ, что и на странице объявления (useAd) — если после
  // отправки первого сообщения пользователь зайдёт на страницу этого
  // объявления, данные уже будут тёплыми.
  const { data: ad, isLoading } = useQuery({
    queryKey: ['ad-public', adId],
    queryFn: () => adsService.findOne(adId),
    enabled: !!adId
  })

  const { startConversation, isStarting } = useStartConversation()

  const handleSend = async (text: string) => {
    const result = await startConversation({ adId, text })
    onStarted(result.conversation.id)
  }

  return (
    <div className='flex min-w-0 flex-1 flex-col'>
      <ChatHeader ad={ad} counterpart={ad?.user} isLoading={isLoading} onBack={onBack} />
      <div className='flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-500'>
        Напишите первое сообщение — так начнётся диалог с продавцом
      </div>
      <MessageComposer onSend={handleSend} isSending={isStarting} />
    </div>
  )
}
