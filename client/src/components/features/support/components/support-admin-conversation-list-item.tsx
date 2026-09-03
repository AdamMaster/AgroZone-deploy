'use client'

import { Ellipsis, UserRound } from 'lucide-react'

import { UserAvatar } from '@/components/features/user/components'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

import { cn } from '@/lib/utils'

import { formatMessageTime } from '@/components/features/messages/utils/format-message-time'

import { useBlockSupportGuest, useHideSupportAdminConversation, useUnblockSupportGuest } from '../hooks'
import { ISupportAdminConversationListItem } from '../types/support.types'

interface SupportAdminConversationListItemProps {
  conversation: ISupportAdminConversationListItem
  isActive: boolean
  onClick: () => void
}

// Та же короткая форма, что и describeParticipant на бэкенде
// (support.service.ts) — первые 8 символов id, этого достаточно, чтобы
// отличить одного гостя от другого в списке, не более того.
function describeGuest(guestId: string) {
  return `Гость (${guestId.slice(0, 8)})`
}

export const SupportAdminConversationListItem = ({
  conversation,
  isActive,
  onClick
}: SupportAdminConversationListItemProps) => {
  const { participant, lastMessage, isUnread } = conversation
  const { blockGuest, isBlocking } = useBlockSupportGuest()
  const { unblockGuest, isUnblocking } = useUnblockSupportGuest()
  const { hideConversation, isHiding } = useHideSupportAdminConversation()

  const isGuest = participant.type === 'guest'
  const isBlocked = isGuest && !!participant.blockedAt
  const title = isGuest ? describeGuest(participant.id) : (participant.displayName ?? 'Пользователь')

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
        'relative flex w-full cursor-pointer items-center gap-3 border-b border-gray-100 px-1 py-2.5 text-left transition-colors hover:bg-gray-100 sm:rounded-lg sm:px-3',
        isActive && 'bg-gray-50'
      )}
    >
      {isGuest ? (
        <div className='flex size-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500'>
          <UserRound className='size-5' />
        </div>
      ) : (
        <UserAvatar user={participant} />
      )}

      <div className='flex min-w-0 flex-1 flex-col'>
        <div className='flex items-center justify-between gap-2'>
          <p className={cn('truncate text-sm font-semibold', isBlocked && 'text-gray-400')}>
            {title}
            {isBlocked && ' · заблокирован'}
          </p>
          {lastMessage && (
            <div className='flex shrink-0 items-center gap-2'>
              <span className='text-xs text-gray-400'>{formatMessageTime(lastMessage.createdAt)}</span>
              {isUnread && <span className='bg-primary size-2 rounded-full' />}
            </div>
          )}
        </div>
        {lastMessage && (
          <p className={cn('truncate pr-8 text-sm', isUnread ? 'text-gray-900' : 'text-gray-400')}>{lastMessage.text}</p>
        )}
      </div>

      {/* Раньше висело только на гостях (единственным пунктом был
      блок/разблок) — теперь тут же и "Удалить чат", которое актуально для
      любого тикета, гостевого или залогиненного участника, так что сам
      DropdownMenu больше не гейтится isGuest. */}
      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={event => event.stopPropagation()}
          className='flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-gray-200'
          aria-label='Действия'
        >
          <Ellipsis className='size-4 text-gray-600' />
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={event => event.stopPropagation()} align='end' className='w-48'>
          {isGuest &&
            (isBlocked ? (
              <DropdownMenuItem disabled={isUnblocking} onClick={() => unblockGuest(participant.id)}>
                Разблокировать
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled={isBlocking} onClick={() => blockGuest(participant.id)}>
                Заблокировать
              </DropdownMenuItem>
            ))}
          {/* Уборка инбокса, не модерация — переписка участника не
          трогается, тикет просто пропадает из списка и вернётся сам, если
          участник напишет снова (см. SupportService.hideConversation на
          бэкенде). Без window.confirm, как и блокировка — действие
          обратимое, не тот уровень риска, что у "Удалить все сообщения" в
          самом треде. */}
          <DropdownMenuItem disabled={isHiding} onClick={() => hideConversation(conversation.id)}>
            Удалить чат
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
