import { useCallback, useEffect, useRef } from 'react'
import { ActivityIndicator, FlatList, type ListRenderItem, Text, View } from 'react-native'

import { Button } from '@/shared/components/button'

import type { ChatMessage } from '../types/message.types'
import { type BubbleAuthor, MessageBubble } from './message-bubble'

interface MessageThreadProps {
  // undefined — история ещё грузится.
  messages: ChatMessage[] | undefined
  // История не загрузилась (нет сети, диалог недоступен).
  error: Error | null
  onRetry: () => void
  isOwnMessage: (message: ChatMessage) => boolean
  // Аватар собеседника у его сообщений (переписка по объявлению).
  counterpart?: BubbleAuthor
  emptyText: string
  hasOlder: boolean
  isLoadingOlder: boolean
  onLoadOlder: () => void
}

const keyExtractor = (message: ChatMessage) => message.id

// Лента сообщений снизу вверх, как в мессенджерах: открывается на последнем
// сообщении, новые появляются внизу, а при прокрутке к началу
// подгружаются более старые.
export function MessageThread({
  messages,
  error,
  onRetry,
  isOwnMessage,
  counterpart,
  emptyText,
  hasOlder,
  isLoadingOlder,
  onLoadOlder
}: MessageThreadProps) {
  const listRef = useRef<FlatList<ChatMessage>>(null)
  const lastMessage = messages?.at(-1)
  const isLastMessageOwn = !!lastMessage && isOwnMessage(lastMessage)

  // Своё только что отправленное сообщение должно быть видно, даже если
  // пользователь листал историю. Чужие новые сообщения ленту не дёргают —
  // перевёрнутый список и так держит её на месте у читающего старое.
  useEffect(() => {
    if (isLastMessageOwn) listRef.current?.scrollToOffset({ offset: 0, animated: true })
  }, [lastMessage?.id, isLastMessageOwn])

  const renderItem: ListRenderItem<ChatMessage> = useCallback(
    ({ item }) => <MessageBubble message={item} isOwn={isOwnMessage(item)} author={counterpart} />,
    [isOwnMessage, counterpart]
  )

  if (!messages && error) {
    return (
      <View className='flex-1 items-center justify-center gap-3 px-6'>
        <Text className='text-center text-sm text-gray-500'>{error.message}</Text>
        <Button title='Повторить' variant='outline' size='sm' onPress={onRetry} />
      </View>
    )
  }

  if (!messages) {
    return (
      <View className='flex-1 items-center justify-center'>
        <Text className='text-sm text-gray-400'>Загрузка...</Text>
      </View>
    )
  }

  if (messages.length === 0) {
    return (
      <View className='flex-1 items-center justify-center px-6'>
        <Text className='text-center text-sm text-gray-400'>{emptyText}</Text>
      </View>
    )
  }

  return (
    <FlatList
      ref={listRef}
      // Перевёрнутый список: первым идёт самое новое сообщение.
      inverted
      data={[...messages].reverse()}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      className='flex-1'
      contentContainerClassName='gap-2 py-3'
      keyboardShouldPersistTaps='handled'
      onEndReached={() => {
        if (hasOlder && !isLoadingOlder) onLoadOlder()
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isLoadingOlder ? (
          <View className='py-2'>
            <ActivityIndicator colorClassName='accent-gray-500' />
          </View>
        ) : null
      }
    />
  )
}
