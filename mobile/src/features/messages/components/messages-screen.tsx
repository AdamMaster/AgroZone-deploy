import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { useCallback, useState } from 'react'
import { RefreshControl, Text, View } from 'react-native'

import { useProfile } from '@/features/auth/hooks/use-profile'
import { SupportListItem } from '@/features/support/components/support-list-item'

import { ActionSheet } from '@/shared/components/action-sheet'
import { ScreenMessage } from '@/shared/components/screen-message'
import { openSitePage } from '@/shared/utils/open-site-page'

import { useChatNavigation } from '../hooks/use-chat-navigation'
import { useBlockUser, useConversations, useDeleteConversation } from '../hooks/use-conversations'
import type { ConversationListItem as Conversation } from '../types/message.types'
import { ConversationListItem } from './conversation-list-item'
import { MessagesHeading } from './messages-heading'

const SKELETON_COUNT = 3

const keyExtractor = (conversation: Conversation) => conversation.id

const ItemSeparator = () => <View className='h-1' />

function ListSkeleton() {
  return (
    <View className='gap-1'>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <View key={index} className='flex-row items-center gap-3'>
          <View className='size-15 rounded-lg bg-skeleton' />
          <View className='h-15 flex-1 rounded-lg bg-skeleton' />
        </View>
      ))}
    </View>
  )
}

// Вкладка «Сообщения» — список диалогов, как MessagesClient сайта на
// телефоне: сверху чат с поддержкой, ниже переписки по объявлениям.
export function MessagesScreen() {
  const { data: profile } = useProfile()
  const isAdmin = profile?.role === 'ADMIN'
  const { data: conversations, error, isPending, refetch } = useConversations()
  const { openConversation, openSupportChat } = useChatNavigation()
  const { mutate: blockUser } = useBlockUser()
  const { mutate: deleteConversation } = useDeleteConversation()
  // Диалог, для которого открыто меню «…». Остаётся заданным, пока меню
  // закрывается, — иначе пункты пропали бы посреди анимации.
  const [menuConversation, setMenuConversation] = useState<Conversation | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const openChat = useCallback((conversation: Conversation) => openConversation(conversation.id), [openConversation])
  const openMenu = useCallback((conversation: Conversation) => {
    setMenuConversation(conversation)
    setIsMenuOpen(true)
  }, [])

  const refresh = async () => {
    setIsRefreshing(true)
    try {
      await refetch()
    } finally {
      setIsRefreshing(false)
    }
  }

  const renderItem: ListRenderItem<Conversation> = useCallback(
    ({ item }) => <ConversationListItem conversation={item} onOpen={openChat} onOpenMenu={openMenu} />,
    [openChat, openMenu]
  )

  // Инбокс обращений администратора (гости, блокировки, модерация) — на сайте.
  const openSupport = () => (isAdmin ? void openSitePage('/profile/settings/messages?c=support') : openSupportChat())

  const listEmpty = isPending ? (
    <ListSkeleton />
  ) : error ? (
    <ScreenMessage
      title='Не удалось загрузить сообщения'
      description={error.message}
      action={{ title: 'Повторить', onPress: () => void refetch() }}
    />
  ) : (
    <Text className='p-4 text-sm text-gray-500'>
      Пока нет ни одного диалога — напишите продавцу со страницы объявления.
    </Text>
  )

  return (
    <View className='flex-1'>
      <FlashList
        data={conversations ?? []}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}
        ListHeaderComponent={
          <View>
            <MessagesHeading />
            <View className='mb-1'>
              <SupportListItem isAdmin={isAdmin} onPress={openSupport} />
            </View>
          </View>
        }
        ItemSeparatorComponent={ItemSeparator}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            colorsClassName='accent-primary'
            tintColorClassName='accent-primary'
          />
        }
      />

      <ActionSheet
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        actions={
          menuConversation
            ? [
                { key: 'block', label: 'Заблокировать', onPress: () => blockUser(menuConversation.counterpart.id) },
                { key: 'delete', label: 'Удалить переписку', onPress: () => deleteConversation(menuConversation.id) }
              ]
            : []
        }
      />
    </View>
  )
}
