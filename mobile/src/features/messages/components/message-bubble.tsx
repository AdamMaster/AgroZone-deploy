import { Text, View } from 'react-native'

import { Avatar } from '@/shared/components/avatar'
import { formatMessageTime } from '@/shared/utils/date'

import type { ChatMessage } from '../types/message.types'

export interface BubbleAuthor {
  id: string
  displayName: string | null
  picture: string | null
}

interface MessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  // Есть — переписка по объявлению (MessageBubble сайта): у сообщений
  // собеседника его аватар, время сбоку от пузыря. Нет — чат поддержки
  // (SupportMessageBubble): без аватара, время внутри пузыря.
  author?: BubbleAuthor
}

const BUBBLE_CLASS = 'rounded-xl px-3.5 py-2'
const OWN_BUBBLE_CLASS = 'bg-primary/10'
const OTHER_BUBBLE_CLASS = 'bg-gray-100'

export function MessageBubble({ message, isOwn, author }: MessageBubbleProps) {
  const bubbleColor = isOwn ? OWN_BUBBLE_CLASS : OTHER_BUBBLE_CLASS
  const time = formatMessageTime(message.createdAt)
  const text = (
    <Text selectable className='text-sm text-gray-900'>
      {message.text}
    </Text>
  )

  if (!author) {
    return (
      <View className={`flex-row ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <View className={`max-w-[80%] ${BUBBLE_CLASS} ${bubbleColor}`}>
          {text}
          <Text className='mt-1 self-end text-[11px] text-gray-400'>{time}</Text>
        </View>
      </View>
    )
  }

  const timeLabel = <Text className='mt-1 text-[11px] text-gray-400'>{time}</Text>

  return (
    <View className={`flex-row items-end gap-2 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {isOwn ? (
        timeLabel
      ) : (
        <View className='mb-0.5'>
          <Avatar name={author.displayName} pictureUrl={author.picture} colorSeed={author.id} size='base' />
        </View>
      )}
      <View className={`max-w-[75%] ${BUBBLE_CLASS} ${bubbleColor}`}>{text}</View>
      {!isOwn && timeLabel}
    </View>
  )
}
