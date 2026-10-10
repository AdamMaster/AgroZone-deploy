import { type Href, type Tabs, usePathname } from 'expo-router'
import { type ComponentProps, type ComponentType, useEffect, useState } from 'react'
import { Keyboard, Platform, Pressable, Text, View } from 'react-native'
import { useUniwind } from 'uniwind'

import { useRequestSignIn } from '@/features/auth/hooks/use-request-sign-in'
import { useAuthStore } from '@/features/auth/store/auth-store'
import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-notifications'
import { useSupportChatStore } from '@/features/support/store/support-chat-store'

import { CountBadge } from '@/shared/components/count-badge'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import {
  ChatCircleFillIcon,
  HeartFillIcon,
  HouseFillIcon,
  StackFillIcon,
  UserFillIcon
} from '@/shared/icons/phosphor-fill-icons'

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0]

interface TabItem {
  // Имя маршрута вкладки в app/(tabs).
  routeName: string
  label: string
  icon: ComponentType<{ size: number; color: string }>
  href: Extract<Href, string>
  requiresAuth: boolean
  // Вкладка со своими разделами (Профиль: безопасность, уведомления;
  // Сообщения: переписки, чёрный список) подсвечена во всех них, как
  // /profile/settings/* на сайте.
  sectionPrefixes?: readonly string[]
  // Значок на иконке, как на сайте: число непрочитанных уведомлений
  // («Профиль») или точка — новый ответ поддержки («Сообщения»).
  badge?: 'unreadNotifications' | 'supportReply'
}

// Те же вкладки, порядок, подписи и иконки, что у MobileTabBar сайта.
const TABS: readonly TabItem[] = [
  { routeName: '(home)', label: 'Главная', icon: HouseFillIcon, href: '/', requiresAuth: false },
  { routeName: '(favorites)', label: 'Избранное', icon: HeartFillIcon, href: '/favorites', requiresAuth: true },
  { routeName: '(my-ads)', label: 'Объявления', icon: StackFillIcon, href: '/my-ads', requiresAuth: true },
  {
    routeName: '(messages)',
    label: 'Сообщения',
    icon: ChatCircleFillIcon,
    href: '/messages',
    requiresAuth: true,
    sectionPrefixes: ['/messages/', '/chat/'],
    badge: 'supportReply'
  },
  {
    routeName: '(profile)',
    label: 'Профиль',
    icon: UserFillIcon,
    href: '/profile',
    requiresAuth: true,
    sectionPrefixes: ['/profile/'],
    badge: 'unreadNotifications'
  }
]

// На Android окно при наборе текста сжимается над клавиатурой, и панель
// поднялась бы вместе с полем ввода (в чате — прямо под ним). Как
// tabBarHideOnKeyboard у React Navigation: пока клавиатура открыта, панели
// нет. На iOS клавиатура просто накрывает панель.
function useIsKeyboardShownOnAndroid(): boolean {
  const [isShown, setIsShown] = useState(false)

  useEffect(() => {
    if (Platform.OS !== 'android') return

    const show = Keyboard.addListener('keyboardDidShow', () => setIsShown(true))
    const hide = Keyboard.addListener('keyboardDidHide', () => setIsShown(false))

    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  return isShown
}

const ICON_SIZE = 20

// Нижняя панель — копия MobileTabBar сайта: белая полоса высотой 56px,
// иконка над подписью 11px, активная вкладка тёмная (в тёмной теме —
// зелёная). Гостя вкладки, требующие входа, отправляют на вход и после
// него открываются сами (как onOpen('login', { returnTo }) на сайте).
export function SiteTabBar({ state, navigation, insets }: TabBarProps) {
  const pathname = usePathname()
  const requestSignIn = useRequestSignIn()
  const { theme } = useUniwind()
  const isSignedIn = useAuthStore(store => store.status === 'signedIn')
  const inactiveColor = useThemeColor('--color-gray-500')
  const activeTextColor = useThemeColor('--color-gray-950')
  const primaryColor = useThemeColor('--color-primary')
  const activeColor = theme === 'dark' ? primaryColor : activeTextColor

  const unreadCount = useUnreadNotificationsCount()
  const hasSupportReply = useSupportChatStore(store => store.hasUnread)
  const isKeyboardShown = useIsKeyboardShownOnAndroid()

  const focusedRouteName = state.routes[state.index]?.name

  if (isKeyboardShown) return null

  return (
    <View
      accessibilityRole='tablist'
      accessibilityLabel='Основная навигация'
      className='flex-row items-stretch justify-around bg-white dark:bg-neutral-800'
      style={{ paddingBottom: insets.bottom }}
    >
      {TABS.map(tab => {
        // Как на сайте: вкладка подсвечена только на своём разделе, а не в
        // каталоге или объявлении, открытых из него.
        const isOnTabSection =
          pathname === tab.href || !!tab.sectionPrefixes?.some(prefix => pathname.startsWith(prefix))
        const isActive = focusedRouteName === tab.routeName && isOnTabSection
        const color = isActive ? activeColor : inactiveColor
        const Icon = tab.icon

        const onPress = () => {
          if (tab.requiresAuth && !isSignedIn) {
            requestSignIn(tab.href)
            return
          }

          const route = state.routes.find(item => item.name === tab.routeName)
          if (!route) return

          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })

          // Нажатие на уже открытую вкладку (например, из объявления)
          // возвращает к её разделу: вложенный стек сам делает это по
          // событию tabPress — стандартное поведение вкладок.
          if (focusedRouteName !== route.name && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params)
          }
        }

        return (
          <Pressable
            key={tab.routeName}
            accessibilityRole='tab'
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            onPress={onPress}
            className='h-14 flex-1 items-center justify-center gap-0.5'
          >
            <View>
              <Icon size={ICON_SIZE} color={color} />
              {tab.badge === 'unreadNotifications' && <CountBadge count={unreadCount} />}
              {tab.badge === 'supportReply' && hasSupportReply && (
                <View pointerEvents='none' className='absolute -top-0.5 -right-1 size-2.5 rounded-full bg-primary' />
              )}
            </View>
            <Text className='text-[11px] font-medium' style={{ color }}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
