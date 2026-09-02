import { Ellipsis, ImageIcon } from 'lucide-react'
import Image from 'next/image'

import { UserAvatar } from '@/components/features/user/components'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import { cn } from '@/lib/utils'

import { useBlockUser, useDeleteConversation } from '../hooks'
import { IConversationListItem } from '../types/message.types'
import { formatMessageTime } from '../utils/format-message-time'

interface ConversationListItemProps {
  conversation: IConversationListItem
  isActive: boolean
  onClick: () => void
}

export const ConversationListItem = ({ conversation, isActive, onClick }: ConversationListItemProps) => {
  const { ad, counterpart, lastMessage, isUnread } = conversation
  const { deleteConversation, isDeleting } = useDeleteConversation()
  const { blockUser, isBlocking } = useBlockUser()

  return (
    <div
      role='button'
      tabIndex={0}
      onClick={onClick}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      className={cn(
        'relative flex w-full cursor-pointer items-center gap-3 border-b border-gray-100 py-2 text-left transition-colors hover:bg-gray-100 sm:rounded-lg sm:px-3 sm:py-3',
        isActive && 'bg-gray-50'
      )}
    >
      <div className='relative'>
        <UserAvatar
          user={counterpart}
          className='absolute -top-2 -left-2 z-10 hidden size-9 border-2 border-white sm:block'
        />
        <div className='relative flex size-15 items-center justify-center overflow-hidden rounded-lg bg-gray-100'>
          {ad.images?.[0] ? (
            <Image src={ad.images[0]} alt='' sizes='200px' fill className='object-cover' />
          ) : (
            <ImageIcon className='size-5 text-gray-400' />
          )}
        </div>
      </div>

      <div className='flex min-w-0 flex-1 flex-col sm:gap-0.5'>
        <div className='flex items-center justify-between gap-2'>
          <p
            className={cn('text-base leading-5 font-semibold sm:text-[16px]', counterpart.deletedAt && 'text-gray-400')}
          >
            {counterpart.deletedAt ? 'Пользователь удалил аккаунт' : (counterpart.displayName ?? 'Пользователь')}
          </p>
          {lastMessage && (
            <div className='flex gap-3'>
              <span className='shrink-0 text-xs text-gray-400'>{formatMessageTime(lastMessage.createdAt)}</span>
              {isUnread && <span className='bg-primary size-2 shrink-0 rounded-full' />}
            </div>
          )}
        </div>
        <p className='truncate text-sm'>{ad.title}</p>
        {lastMessage && (
          <p className={cn('truncate pr-12 text-sm', isUnread ? 'text-gray-900' : 'text-gray-400')}>
            {lastMessage.text}
          </p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={event => event.stopPropagation()}
          className='absolute right-3 bottom-3 flex size-9 items-center justify-center rounded-lg bg-white dark:bg-neutral-800'
        >
          <Ellipsis className='size-5 text-gray-700' />
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={event => event.stopPropagation()} align='end' className='w-44'>
          <DropdownMenuItem disabled={isBlocking} onClick={() => blockUser(counterpart.id)}>
            Заблокировать
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isDeleting} onClick={() => deleteConversation(conversation.id)}>
            Удалить переписку
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
