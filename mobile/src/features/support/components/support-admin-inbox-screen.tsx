import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { RefreshControl, Text, View } from 'react-native'

import { ChatHeader } from '@/features/messages/components/chat-header'
import { ChatLayout } from '@/features/messages/components/chat-layout'
import { useChatNavigation } from '@/features/messages/hooks/use-chat-navigation'

import { ActionSheet, type SheetAction } from '@/shared/components/action-sheet'
import { ScreenMessage } from '@/shared/components/screen-message'
import { useRefetchOnFocus } from '@/shared/hooks/use-refetch-on-focus'

import {
  useBlockSupportGuest,
  useHideSupportAdminConversation,
  useSupportAdminConversations,
  useUnblockSupportGuest
} from '../hooks/use-support-admin'
import { ADMIN_LIST_VIEW, useSupportChatStore } from '../store/support-chat-store'
import type { SupportAdminConversation } from '../types/support.types'
import { SupportAdminListItem } from './support-admin-list-item'
import { SupportAvatar } from './support-avatar'

const SUPPORT_COUNTERPART = { id: 'support', displayName: 'Обращения в поддержку', picture: null }
const SKELETON_COUNT = 3

const keyExtractor = (conversation: SupportAdminConversation) => conversation.id

function ListSkeleton() {
  return (
    <View className='gap-1'>
      {Array.from({ length: SKELETON_COUNT }, (_, index) => (
        <View key={index} className='flex-row items-center gap-3 px-2 py-2'>
          <View className='size-10 rounded-full bg-skeleton' />
          <View className='h-10 flex-1 rounded-lg bg-skeleton' />
        </View>
      ))}
    </View>
  )
}

// Список обращений в поддержку для администратора — SupportAdminInbox сайта.
export function SupportAdminInboxScreen() {
  const { data: conversations, error, isPending, refetch } = useSupportAdminConversations()
  const { openSupportConversation } = useChatNavigation()
  const { mutate: blockGuest } = useBlockSupportGuest()
  const { mutate: unblockGuest } = useUnblockSupportGuest()
  const { mutate: hideConversation } = useHideSupportAdminConversation()
  const setHasUnread = useSupportChatStore(state => state.setHasUnread)
  const setAdminView = useSupportChatStore(state => state.setAdminView)
  const leaveAdminView = useSupportChatStore(state => state.leaveAdminView)
  // Обращение, для которого открыто меню «…». Остаётся заданным, пока меню
  // закрывается, — иначе пункты пропали бы посреди анимации.
  const [menuConversation, setMenuConversation] = useState<SupportAdminConversation | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Список на виду — новое обращение, из-за которого он обновился, уже
  // видно (непрочитанные подсвечены в самом списке).
  useFocusEffect(
    useCallback(() => {
      setAdminView(ADMIN_LIST_VIEW)
      setHasUnread(false)
      return () => leaveAdminView(ADMIN_LIST_VIEW)
    }, [setAdminView, setHasUnread, leaveAdminView])
  )

  useRefetchOnFocus(refetch)

  const openConversation = useCallback(
    (conversation: SupportAdminConversation) => openSupportConversation(conversation.id),
    [openSupportConversation]
  )
  const openMenu = useCallback((conversation: SupportAdminConversation) => {
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

  const renderItem: ListRenderItem<SupportAdminConversation> = useCallback(
    ({ item }) => <SupportAdminListItem conversation={item} onOpen={openConversation} onOpenMenu={openMenu} />,
    [openConversation, openMenu]
  )

  const menuActions: SheetAction[] = []
  if (menuConversation) {
    const { participant } = menuConversation
    if (participant.type === 'guest') {
      menuActions.push(
        participant.blockedAt
          ? { key: 'unblock', label: 'Разблокировать', onPress: () => unblockGuest(participant.id) }
          : { key: 'block', label: 'Заблокировать', onPress: () => blockGuest(participant.id) }
      )
    }
    // Уборка списка, не модерация: переписка участника остаётся, обращение
    // вернётся, если он напишет снова.
    menuActions.push({ key: 'hide', label: 'Удалить чат', onPress: () => hideConversation(menuConversation.id) })
  }

  const listEmpty = isPending ? (
    <ListSkeleton />
  ) : error ? (
    <ScreenMessage
      title='Не удалось загрузить обращения'
      description={error.message}
      action={{ title: 'Повторить', onPress: () => void refetch() }}
    />
  ) : (
    <Text className='p-4 text-center text-sm text-gray-500'>Пока нет ни одного обращения</Text>
  )

  return (
    <ChatLayout
      header={<ChatHeader counterpart={SUPPORT_COUNTERPART} avatar={<SupportAvatar />} />}
      thread={
        <View className='flex-1 pt-1'>
          <FlashList
            data={conversations ?? []}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
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
          <ActionSheet visible={isMenuOpen} onClose={() => setIsMenuOpen(false)} actions={menuActions} />
        </View>
      }
    />
  )
}
