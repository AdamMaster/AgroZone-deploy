import { UserAvatar } from '@/components/features/user/components'

import { cn } from '@/lib/utils'

import { IMessage } from '../types/message.types'
import { formatMessageTime } from '../utils/format-message-time'

interface MessageBubbleCounterpart {
  id: string
  displayName?: string | null
  picture?: string | null
}

interface MessageBubbleProps {
  message: IMessage
  isOwn: boolean
  // Аватар собеседника — рисуется только у ЕГО сообщений, чтобы сразу было
  // понятно, кто пишет; у своих сообщений аватар не нужен (и так понятно,
  // чьи они — они справа).
  counterpart?: MessageBubbleCounterpart
}

export const MessageBubble = ({ message, isOwn, counterpart }: MessageBubbleProps) => {
  return (
    <div className='flex items-end'>
      <div className={cn('flex w-full items-end gap-2', isOwn ? 'justify-end' : 'justify-start')}>
        {!isOwn && (
          <UserAvatar
            user={counterpart ?? { id: '', displayName: null, picture: null }}
            size='lg'
            className='mb-0.5 shrink-0'
          />
        )}
        <div
          className={cn(
            'max-w-[75%] rounded-xl px-3.5 py-2 text-sm whitespace-pre-wrap',
            isOwn ? 'bg-primary/10' : 'bg-gray-100 text-gray-900'
          )}
        >
          {message.text}
        </div>
        <div className={cn('mt-1 text-right text-[11px] text-gray-400', isOwn && '-order-1')}>
          {formatMessageTime(message.createdAt)}
        </div>
      </div>
    </div>
  )
}
