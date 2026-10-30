import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'

import { useAdNavigation } from '@/features/ads/hooks/use-ad-navigation'
import { useProfile } from '@/features/auth/hooks/use-profile'
import { useChatNavigation } from '@/features/messages/hooks/use-chat-navigation'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications
} from '@/features/notifications/hooks/use-notifications'
import { resolveNotificationTarget } from '@/features/notifications/lib/notification-target'
import type { AppNotification } from '@/features/notifications/types/notification.types'

import { Heading } from '@/shared/components/heading'
import { QueryState } from '@/shared/components/query-state'
import { Switch } from '@/shared/components/switch'
import { useRefetchOnFocus } from '@/shared/hooks/use-refetch-on-focus'
import { formatTimeOrDayMonth } from '@/shared/utils/date'
import { openSitePage } from '@/shared/utils/open-site-page'

import { useUpdateChatEmailNotifications } from '../hooks/use-profile-mutations'
import { ProfileSectionScreen } from './profile-section-screen'
import { SettingsCard } from './settings-card'

// Переключатель писем о сообщениях: без почты письмо слать некуда.
function ChatEmailNotificationsSetting() {
  const { data: profile } = useProfile()
  const { mutate: update } = useUpdateChatEmailNotifications()

  if (!profile?.email) return null

  return (
    <View className='mb-6'>
      <SettingsCard
        label='Письма о новых сообщениях'
        description='Присылать на почту, если вы не прочитали сообщение в чате в течение получаса. Письма о безопасности и модерации приходят всегда.'
        action={
          <Switch
            value={profile.chatEmailNotifications}
            onValueChange={update}
            accessibilityLabel='Письма о новых сообщениях'
          />
        }
      />
    </View>
  )
}

// «Уведомления» — как /profile/settings/notifications сайта. Нажатие
// помечает уведомление прочитанным и, если у него есть ссылка, открывает
// то, к чему оно относится (например, отклонённое объявление).
export function ProfileNotificationsScreen() {
  const router = useRouter()
  const { openAd, openSeller } = useAdNavigation()
  const { openConversation } = useChatNavigation()
  const notificationsQuery = useNotifications()
  const { mutate: markRead } = useMarkNotificationRead()
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsRead()
  const unreadCount = notificationsQuery.data?.filter(notification => !notification.isRead).length ?? 0

  // Уведомления приходят, пока пользователь в других разделах.
  useRefetchOnFocus(notificationsQuery.refetch)

  const open = (notification: AppNotification) => {
    if (!notification.isRead) markRead(notification.id)

    const target = resolveNotificationTarget(notification.link)
    if (!target) return

    switch (target.kind) {
      case 'ad':
        return openAd(target.id, target.view)
      case 'conversation':
        return openConversation(target.id)
      case 'seller':
        return openSeller(target.id, target.tab)
      case 'messages':
        return router.navigate('/messages')
      case 'site':
        return void openSitePage(target.path)
    }
  }

  return (
    <ProfileSectionScreen title='Уведомления' onRefresh={notificationsQuery.refetch}>
      <ChatEmailNotificationsSetting />
      <QueryState query={notificationsQuery} errorTitle='Не удалось загрузить уведомления'>
        {notifications =>
          notifications.length === 0 ? (
            <View>
              <Heading level={3} className='mb-2'>
                Пока нет уведомлений
              </Heading>
              <Text className='text-[15px] leading-[1.4] text-gray-600'>
                Здесь будут появляться важные события по вашим объявлениям — например, если модератор отклонит
                объявление и укажет причину.
              </Text>
            </View>
          ) : (
            <View>
              {unreadCount > 0 && (
                // На сайте «Прочитать все» справа от заголовка; здесь там
                // колокольчик и меню, поэтому кнопка строкой ниже.
                <Pressable
                  accessibilityRole='button'
                  disabled={isMarkingAll}
                  hitSlop={8}
                  onPress={() => markAllRead()}
                  className='mb-3 self-end disabled:opacity-50'
                >
                  <Text className='text-sm text-gray-500'>Прочитать все</Text>
                </Pressable>
              )}

              <View className='-mx-4 gap-2'>
                {notifications.map(notification => (
                  <Pressable
                    key={notification.id}
                    accessibilityRole={notification.link ? 'link' : 'button'}
                    accessibilityLabel={`${notification.isRead ? '' : 'Непрочитанное. '}${notification.title}. ${notification.message}`}
                    onPress={() => open(notification)}
                    className={`gap-1 rounded-xl p-4 active:bg-gray-50 ${notification.isRead ? '' : 'bg-gray-50'}`}
                  >
                    <View className='flex-row items-center gap-1.5'>
                      {!notification.isRead && <View className='size-1.5 rounded-full bg-primary' />}
                      <Text className='flex-1 text-base font-medium text-gray-900'>{notification.title}</Text>
                    </View>
                    <Text className='text-sm text-gray-600'>{notification.message}</Text>
                    <Text className='mt-1 text-xs text-gray-400'>{formatTimeOrDayMonth(notification.createdAt)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )
        }
      </QueryState>
    </ProfileSectionScreen>
  )
}
