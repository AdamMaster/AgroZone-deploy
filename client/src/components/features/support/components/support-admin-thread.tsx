'use client'

import { ArrowLeft, Ellipsis, UserRound } from 'lucide-react'
import { useEffect } from 'react'

import { MessageComposer } from '@/components/features/messages/components'
import { UserAvatar } from '@/components/features/user/components'
import { Button } from '@/components/ui'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import {
  useClearSupportAdminMessages,
  useDeleteSupportAdminMessage,
  useMarkSupportAdminConversationRead,
  useSendSupportAdminMessage,
  useSupportAdminMessages
} from '../hooks'
import { ISupportAdminConversationListItem, ISupportMessage } from '../types/support.types'
import { SupportMessageThread } from './support-message-thread'

interface SupportAdminThreadProps {
  conversation: ISupportAdminConversationListItem
  onBack: () => void
}

function describeGuest(guestId: string) {
  return `Гость (${guestId.slice(0, 8)})`
}

export const SupportAdminThread = ({ conversation, onBack }: SupportAdminThreadProps) => {
  const { participant } = conversation
  const { messages, isLoading, hasMore, isLoadingMore, loadOlder } = useSupportAdminMessages(conversation.id)
  const { sendMessage, isSending } = useSendSupportAdminMessage(conversation.id)
  const { markRead } = useMarkSupportAdminConversationRead()
  const { deleteMessage } = useDeleteSupportAdminMessage(conversation.id)
  const { clearMessages, isClearing } = useClearSupportAdminMessages(conversation.id)

  useEffect(() => {
    markRead(conversation.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, messages.length])

  // "Не от самого участника тикета" = от поддержки — та же логика, что и
  // lastMessageFromAdmin в SupportService.getAdminConversations на
  // бэкенде: у гостевого тикета участник пишет только через
  // senderGuestId, у тикета залогиненного участника — senderId равен его
  // собственному id.
  const isOwnMessage = (message: ISupportMessage) =>
    participant.type === 'guest' ? message.senderGuestId === null : message.senderId !== participant.id

  const title =
    participant.type === 'guest' ? describeGuest(participant.id) : (participant.displayName ?? 'Пользователь')

  // window.confirm, а не кастомная модалка — единственное разрушительное
  // действие во всём support-разделе, и в отличие от удаления одного
  // сообщения (без подтверждения, см. SupportMessageBubble) тут другой
  // масштаб — стирается вся история тикета разом, необратимо, у обеих
  // сторон. Полноценная модалка ради одной такой кнопки — избыточно.
  const handleClearAll = () => {
    if (!messages.length || isClearing) return

    if (window.confirm('Удалить все сообщения этого тикета? Действие необратимо и затронет обе стороны переписки.')) {
      clearMessages()
    }
  }

  return (
    <div className='flex min-h-0 flex-1 flex-col'>
      <div className='flex items-center gap-2 border-b border-gray-100 px-2 py-2'>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={onBack}
          aria-label='К списку обращений'
          className='size-9'
        >
          <ArrowLeft className='size-5' />
        </Button>

        {participant.type === 'guest' ? (
          <div className='flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500'>
            <UserRound className='size-4' />
          </div>
        ) : (
          <UserAvatar user={participant} size='sm' />
        )}

        <p className='flex-1 truncate text-sm font-semibold'>{title}</p>

        <DropdownMenu>
          <DropdownMenuTrigger
            className='flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-gray-100'
            aria-label='Действия с перепиской'
          >
            <Ellipsis className='size-4 text-gray-600' />
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-56'>
            <DropdownMenuItem
              disabled={isClearing || !messages.length}
              onClick={handleClearAll}
              className='text-red-500 focus:text-red-500'
            >
              Удалить все сообщения
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SupportMessageThread
        messages={messages}
        isLoading={isLoading}
        isOwnMessage={isOwnMessage}
        emptyText='Сообщений пока нет'
        onDeleteMessage={deleteMessage}
        hasMore={hasMore}
        isLoadingMore={isLoadingMore}
        onLoadOlder={loadOlder}
      />

      <div className='border-t border-gray-100 p-2'>
        <MessageComposer onSend={sendMessage} isSending={isSending} placeholder='Ответить...' />
      </div>
    </div>
  )
}
