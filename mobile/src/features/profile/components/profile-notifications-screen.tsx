import { useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'

import { useAdNavigation } from '@/features/ads/hooks/use-ad-navigation'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications
} from '@/features/notifications/hooks/use-notifications'
import { resolveNotificationTarget } from '@/features/notifications/lib/notification-target'
import type { AppNotification } from '@/features/notifications/types/notification.types'

import { Heading } from '@/shared/components/heading'
import { ScreenMessage } from '@/shared/components/screen-message'
import { useRefetchOnFocus } from '@/shared/hooks/use-refetch-on-focus'
import { formatTimeOrDayMonth } from '@/shared/utils/date'
import { openSitePage } from '@/shared/utils/open-site-page'

import { ProfileSectionScreen } from './profile-section-screen'

// «Уведомления» — как /profile/settings/notifications сайта. Нажатие
// помечает уведомление прочитанным и, если у него есть ссылка, открывает
// то, к чему оно относится (например, отклонённое объявление).
export function ProfileNotificationsScreen() {
  const router = useRouter()
  const { openAd } = useAdNavigation()
  const { data: notifications, error, isPending, refetch } = useNotifications()
  const { mutate: markRead } = useMarkNotificationRead()
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsRead()
  const unreadCount = notifications?.filter(notification => !notification.isRead).length ?? 0

  // Уведомления приходят, пока пользователь в других разделах.
  useRefetchOnFocus(refetch)

  const open = (notification: AppNotification) => {
    if (!notification.isRead) markRead(notification.id)

    const target = resolveNotificationTarget(notification.link)
    if (!target) return

    switch (target.kind) {
      case 'ad':
        return openAd(target.id, target.view)
      case 'messages':
        return router.navigate('/messages')
      case 'site':
        return void openSitePage(target.path)
    }
  }

  return (
    <ProfileSectionScreen title='Уведомления' onRefresh={refetch}>
      {isPending ? (
        <View className='items-center py-16'>
          <ActivityIndicator colorClassName='accent-primary' />
        </View>
      ) : !notifications ? (
        <ScreenMessage
          title='Не удалось загрузить уведомления'
          description={error?.message}
          action={{ title: 'Повторить', onPress: () => void refetch() }}
        />
      ) : notifications.length === 0 ? (
        <View>
          <Heading level={3} className='mb-2'>
            Пока нет уведомлений
          </Heading>
          <Text className='text-[15px] leading-[1.4] text-gray-600'>
            Здесь будут появляться важные события по вашим объявлениям — например, если модератор отклонит объявление и
            укажет причину.
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
      )}
    </ProfileSectionScreen>
  )
}
