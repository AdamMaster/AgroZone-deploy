import Image from 'next/image'

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
  // Нажатие на фото — открыть его на весь экран (владеет просмотрщиком
  // MessageThread: он один на всю переписку).
  onPhotoClick?: (photos: string[], index: number) => void
}

export const MessageBubble = ({ message, isOwn, counterpart, onPhotoClick }: MessageBubbleProps) => {
  const { attachments } = message
  const hasText = message.text.trim().length > 0
  const hasPhotos = attachments.length > 0

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
            'max-w-[75%] rounded-xl text-sm whitespace-pre-wrap',
            hasPhotos ? 'w-60 p-1' : 'px-3.5 py-2',
            isOwn ? 'bg-primary/10' : 'bg-gray-100 text-gray-900'
          )}
        >
          {hasPhotos && (
            <div className={cn('grid gap-1', attachments.length > 1 && 'grid-cols-2')}>
              {attachments.map((photo, index) => (
                <button
                  key={photo}
                  type='button'
                  onClick={() => onPhotoClick?.(attachments, index)}
                  aria-label={`Открыть фото ${index + 1}`}
                  className={cn(
                    'relative cursor-zoom-in overflow-hidden rounded-lg bg-gray-200',
                    attachments.length === 1 ? 'aspect-4/3' : 'aspect-square',
                    // Нечётное число фото: последнее — на всю ширину.
                    attachments.length > 2 && attachments.length % 2 === 1 && index === attachments.length - 1
                      ? 'col-span-2 aspect-video'
                      : ''
                  )}
                >
                  <Image src={photo} alt='' fill sizes='240px' className='object-cover' />
                </button>
              ))}
            </div>
          )}
          {hasText && <div className={cn(hasPhotos && 'px-2.5 pt-1.5 pb-1')}>{message.text}</div>}
        </div>
        <div className={cn('mt-1 text-right text-[11px] text-gray-400', isOwn && '-order-1')}>
          {formatMessageTime(message.createdAt)}
        </div>
      </div>
    </div>
  )
}
