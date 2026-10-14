import { Pressable, Text, View } from 'react-native'

import { AdPhoto } from '@/shared/components/ad-photo'
import { Avatar } from '@/shared/components/avatar'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Trash2 } from '@/shared/icons/lucide'
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
  // Только у администратора в чате поддержки (SupportMessageBubble сайта):
  // корзина с внешнего края пузыря, всегда на виду — наведения на телефоне нет.
  onDelete?: () => void
  // Нажатие на фото — открыть его на весь экран (просмотрщик один на всю
  // ленту, его держит MessageThread).
  onPhotoPress?: (photos: string[], index: number) => void
}

const BUBBLE_CLASS = 'rounded-xl px-3.5 py-2'
// Пузырь с фото — как на сайте: фиксированная ширина, фото почти вплотную к краю.
const PHOTO_BUBBLE_CLASS = 'w-60 rounded-xl p-1'
// Сетка фото (ширина пузыря 240 минус отступы по 4 с каждой стороны, зазор 4):
// одно фото — на всю ширину, несколько — в два столбца, нечётное последнее —
// на всю ширину.
const PHOTO_GRID_WIDTH = 232
const PHOTO_GRID_GAP = 4
const HALF_WIDTH = (PHOTO_GRID_WIDTH - PHOTO_GRID_GAP) / 2

const photoTileSize = (count: number, index: number) => {
  if (count === 1) return { width: PHOTO_GRID_WIDTH, height: 174 }
  if (count > 2 && count % 2 === 1 && index === count - 1) return { width: PHOTO_GRID_WIDTH, height: 130 }

  return { width: HALF_WIDTH, height: HALF_WIDTH }
}
const OWN_BUBBLE_CLASS = 'bg-primary/10'
const OTHER_BUBBLE_CLASS = 'bg-gray-100'

export function MessageBubble({ message, isOwn, author, onDelete, onPhotoPress }: MessageBubbleProps) {
  const deleteIconColor = useThemeColor('--color-gray-400')
  const bubbleColor = isOwn ? OWN_BUBBLE_CLASS : OTHER_BUBBLE_CLASS
  const time = formatMessageTime(message.createdAt)
  const { attachments } = message
  const hasPhotos = attachments.length > 0
  const hasText = message.text.trim().length > 0
  const bubbleClass = hasPhotos ? PHOTO_BUBBLE_CLASS : BUBBLE_CLASS
  const content = (
    <>
      {hasPhotos && (
        <View className='flex-row flex-wrap gap-1'>
          {attachments.map((photo, index) => (
            <Pressable
              key={photo}
              accessibilityRole='imagebutton'
              accessibilityLabel={`Открыть фото ${index + 1}`}
              onPress={() => onPhotoPress?.(attachments, index)}
              style={photoTileSize(attachments.length, index)}
              className='overflow-hidden rounded-lg bg-gray-200'
            >
              <AdPhoto
                url={photo}
                size={attachments.length === 1 ? 800 : 400}
                className='size-full'
                contentFit='cover'
              />
            </Pressable>
          ))}
        </View>
      )}
      {hasText && (
        <Text selectable className={`text-sm text-gray-900 ${hasPhotos ? 'px-2.5 pt-1.5 pb-1' : ''}`}>
          {message.text}
        </Text>
      )}
    </>
  )

  if (!author) {
    const deleteButton = onDelete && (
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Удалить сообщение'
        hitSlop={8}
        onPress={onDelete}
        className='mb-1 size-6 items-center justify-center rounded-md active:bg-gray-100'
      >
        <Trash2 size={14} color={deleteIconColor} />
      </Pressable>
    )

    return (
      <View className={`flex-row items-end gap-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
        {isOwn && deleteButton}
        <View className={`max-w-[80%] ${bubbleClass} ${bubbleColor}`}>
          {content}
          <Text className='mt-1 self-end text-[11px] text-gray-400'>{time}</Text>
        </View>
        {!isOwn && deleteButton}
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
      <View className={`max-w-[75%] ${bubbleClass} ${bubbleColor}`}>{content}</View>
      {!isOwn && timeLabel}
    </View>
  )
}
