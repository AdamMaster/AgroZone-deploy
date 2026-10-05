'use client'

import { useSupportChatStore } from '@/store'
import { ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'

import { MessageComposer } from '@/components/features/messages/components/message-composer'
import { Button } from '@/components/ui'

import { useProfile } from '@/shared/hooks'

import { useMarkSupportMyConversationRead, useSendSupportMyMessage, useSupportMyMessages } from '../hooks'
import { ISupportMessage } from '../types/support.types'
import { SupportMessageThread } from './support-message-thread'

// Единственный тикет участника — в отличие от AD-переписки тут нет списка
// диалогов вообще (см. partial unique index conversation_support_buyer_unique
// /guest_unique на бэкенде: у одного участника ровно один тикет
// поддержки), поэтому и своя ChatPane/ConversationList не нужны — сразу
// тред + композер.
interface SupportParticipantChatProps {
  // Есть, когда чат встроен в страницу «Сообщения» (а не открыт в панели с
  // собственным крестиком) — тогда в шапке показывается стрелка «назад».
  onBack?: () => void
}

export const SupportParticipantChat = ({ onBack }: SupportParticipantChatProps) => {
  const { user } = useProfile()
  const setHasUnread = useSupportChatStore(state => state.setHasUnread)
  const { messages, isLoading, hasMore, isLoadingMore, loadOlder } = useSupportMyMessages(true)
  const { sendMessage, isSending } = useSendSupportMyMessage()
  const { markRead } = useMarkSupportMyConversationRead()

  // Чат открыт и на него смотрят — всё, что пришло, уже прочитано, в том
  // числе сообщение, которое прилетело по сокету прямо сейчас.
  useEffect(() => {
    markRead()
    setHasUnread(false)
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
      <div className='bg-primary flex items-center gap-2 border-b border-gray-100 px-4 py-3 text-[#fff]'>
        {onBack && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={onBack}
            aria-label='Назад к диалогам'
            className='-ml-2 size-8 text-[#fff] hover:bg-white/15 hover:text-[#fff]'
          >
            <ArrowLeft className='size-5' />
          </Button>
        )}
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
