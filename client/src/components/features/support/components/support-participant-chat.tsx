'use client'

import { useEffect } from 'react'

import { MessageComposer } from '@/components/features/messages/components'

import { useProfile } from '@/shared/hooks'

import { useMarkSupportMyConversationRead, useSendSupportMyMessage, useSupportMyMessages } from '../hooks'
import { ISupportMessage } from '../types/support.types'
import { SupportMessageThread } from './support-message-thread'

// Единственный тикет участника — в отличие от AD-переписки тут нет списка
// диалогов вообще (см. partial unique index conversation_support_buyer_unique
// /guest_unique на бэкенде: у одного участника ровно один тикет
// поддержки), поэтому и своя ChatPane/ConversationList не нужны — сразу
// тред + композер.
export const SupportParticipantChat = () => {
  const { user } = useProfile()
  const { messages, isLoading, hasMore, isLoadingMore, loadOlder } = useSupportMyMessages(true)
  const { sendMessage, isSending } = useSendSupportMyMessage()
  const { markRead } = useMarkSupportMyConversationRead()

  useEffect(() => {
    markRead()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length])

  // Гость не знает свой собственный SupportGuest.id (сессия — httpOnly,
  // JS его не видит), но это и не нужно: у гостевого тикета ровно один
  // гость, так что "senderGuestId не null" однозначно значит "это я".
  // У залогиненного участника наоборот — сравниваем с его собственным id,
  // потому что senderId бывает и у админа (оба User на бэкенде).
  const isOwnMessage = (message: ISupportMessage) =>
    user ? message.senderId === user.id : message.senderGuestId !== null

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div className='bg-primary border-b border-gray-100 px-4 py-3 text-[#fff]'>
        <p className='font-semibold'>Поддержка AgroZone</p>
      </div>
      <SupportMessageThread
        messages={messages}
        isLoading={isLoading}
        isOwnMessage={isOwnMessage}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadOlder={loadOlder}
      />
      <div className='border-t border-gray-100 p-2'>
        <MessageComposer onSend={sendMessage} isSending={isSending} placeholder='Опишите вопрос...' />
      </div>
    </div>
  )
}
