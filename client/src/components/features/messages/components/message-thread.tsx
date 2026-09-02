'use client'

import { useEffect, useRef } from 'react'

import { ScrollArea } from '@/components/ui'

import { useProfile } from '@/shared/hooks'

import { IMessage } from '../types/message.types'
import { MessageBubble } from './message-bubble'

interface MessageThreadCounterpart {
  id: string
  displayName?: string | null
  picture?: string | null
}

interface MessageThreadProps {
  messages: IMessage[]
  isLoading: boolean
  counterpart?: MessageThreadCounterpart
}

export const MessageThread = ({ messages, isLoading, counterpart }: MessageThreadProps) => {
  const { user } = useProfile()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Прокручиваем к последнему сообщению при открытии диалога и при
  // появлении новых — без этого пользователь каждый раз видел бы начало
  // переписки, а не то, что ему только что написали.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  if (isLoading) {
    return <div className='flex flex-1 items-center justify-center text-sm text-gray-400'>Загрузка...</div>
  }

  if (!messages.length) {
    return <div className='flex flex-1 items-center justify-center text-sm text-gray-400'>Сообщений пока нет</div>
  }

  return (
    <ScrollArea className='min-h-0 flex-1 px-4 py-3'>
      <div className='flex flex-col gap-2'>
        {messages.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={message.senderId === user?.id}
            counterpart={counterpart}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
