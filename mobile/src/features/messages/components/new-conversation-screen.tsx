import { useEffect } from 'react'
import { Text, View } from 'react-native'

import { useAdDetail } from '@/features/ads/hooks/use-ad-detail'

import { useChatNavigation } from '../hooks/use-chat-navigation'
import { useConversations, useStartConversation } from '../hooks/use-conversations'
import { ChatHeader } from './chat-header'
import { ChatLayout } from './chat-layout'
import { MessageComposer } from './message-composer'

// «Написать» со страницы объявления — NewConversation сайта: диалога ещё
// нет, первое сообщение его создаёт. Если диалог по этому объявлению уже
// есть, сразу открывается он.
export function NewConversationScreen({ adId }: { adId: string }) {
  const { replaceWithConversation } = useChatNavigation()
  const { data: ad, isPending: isAdPending } = useAdDetail(adId, 'public')
  const { data: conversations } = useConversations()
  const { mutateAsync: startConversation, isPending: isStarting } = useStartConversation()
  const existingId = conversations?.find(item => item.ad.id === adId)?.id

  useEffect(() => {
    if (existingId) replaceWithConversation(existingId)
  }, [existingId, replaceWithConversation])

  const send = async (text: string) => {
    try {
      const { conversation } = await startConversation({ adId, text })
      replaceWithConversation(conversation.id)
      return true
    } catch {
      return false
    }
  }

  return (
    <ChatLayout
      header={
        <ChatHeader
          counterpart={ad?.user ?? undefined}
          ad={ad ? { id: ad.id, title: ad.title, images: ad.images } : undefined}
          isLoading={isAdPending}
        />
      }
      thread={
        <View className='flex-1 items-center justify-center px-6'>
          <Text className='text-center text-sm text-gray-500'>
            Напишите первое сообщение — так начнётся диалог с продавцом
          </Text>
        </View>
      }
      composer={<MessageComposer onSend={send} isSending={isStarting} />}
    />
  )
}
