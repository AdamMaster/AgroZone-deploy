'use client'

import { useEffect, useRef } from 'react'

import { Button, ScrollArea } from '@/components/ui'

import { ISupportMessage } from '../types/support.types'
import { SupportMessageBubble } from './support-message-bubble'

interface SupportMessageThreadProps {
  messages: ISupportMessage[]
  isLoading: boolean
  // Как определить isOwn — разное у участника и у админа (см.
  // SupportParticipantChat/SupportAdminThread), поэтому сама функция
  // передаётся снаружи, а не решается тут.
  isOwnMessage: (message: ISupportMessage) => boolean
  emptyText?: string
  // Передаётся только из SupportAdminThread — см. SupportMessageBubble.onDelete.
  onDeleteMessage?: (messageId: string) => void
  // Пагинация "вверх по истории" (см. useSupportAdminMessages/
  // useSupportMyMessages) — необязательные, потому что тред без сообщений
  // вообще не рендерит эту ветку (см. return ниже).
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadOlder?: () => void
}

export const SupportMessageThread = ({
  messages,
  isLoading,
  isOwnMessage,
  emptyText = 'Напишите нам — мы отвечаем обычно в течение дня',
  onDeleteMessage,
  hasMore = false,
  isLoadingMore = false,
  onLoadOlder
}: SupportMessageThreadProps) => {
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastMessageIdRef = useRef<string | null>(null)

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    const lastMessageId = lastMessage?.id ?? null

    // Прокрутка вниз — только когда сменилось САМОЕ НОВОЕ сообщение (пришло
    // новое или это первая загрузка треда). Догрузка старых сообщений через
    // "Показать предыдущие" тоже меняет messages.length, но там смысл ровно
    // противоположный — показать то, что выше, а не уносить экран вниз к
    // текущим сообщениям, теряя то, что человек только что подгрузил.
    if (lastMessageId !== lastMessageIdRef.current) {
      lastMessageIdRef.current = lastMessageId
      bottomRef.current?.scrollIntoView({ block: 'end' })
    }
  }, [messages])

  if (isLoading) {
    return <div className='flex flex-1 items-center justify-center text-sm text-gray-400'>Загрузка...</div>
  }

  if (!messages.length) {
    return (
      <div className='flex flex-1 items-center justify-center px-6 text-center text-sm text-gray-400'>{emptyText}</div>
    )
  }

  return (
    <ScrollArea className='min-h-0 flex-1 px-3 py-3'>
      <div className='flex flex-col gap-2'>
        {hasMore && onLoadOlder && (
          <div className='flex justify-center pb-1'>
            <Button type='button' variant='outline' size='sm' disabled={isLoadingMore} onClick={onLoadOlder}>
              {isLoadingMore ? 'Загрузка...' : 'Показать предыдущие'}
            </Button>
          </div>
        )}

        {messages.map(message => (
          <SupportMessageBubble
            key={message.id}
            message={message}
            isOwn={isOwnMessage(message)}
            onDelete={onDeleteMessage ? () => onDeleteMessage(message.id) : undefined}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
