import { type Href, type Tabs, usePathname } from 'expo-router'
import type { ComponentProps, ComponentType } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useUniwind } from 'uniwind'

import { useRequestSignIn } from '@/features/auth/hooks/use-request-sign-in'
import { useAuthStore } from '@/features/auth/store/auth-store'

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
  href: Href
  requiresAuth: boolean
}

// Те же вкладки, порядок, подписи и иконки, что у MobileTabBar сайта.
const TABS: readonly TabItem[] = [
  { routeName: '(home)', label: 'Главная', icon: HouseFillIcon, href: '/', requiresAuth: false },
  { routeName: 'favorites', label: 'Избранное', icon: HeartFillIcon, href: '/favorites', requiresAuth: true },
  { routeName: 'my-ads', label: 'Объявления', icon: StackFillIcon, href: '/my-ads', requiresAuth: true },
  { routeName: 'messages', label: 'Сообщения', icon: ChatCircleFillIcon, href: '/messages', requiresAuth: true },
  { routeName: 'profile', label: 'Профиль', icon: UserFillIcon, href: '/profile', requiresAuth: true }
]

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

  const focusedRouteName = state.routes[state.index]?.name

  return (
    <View
      accessibilityRole='tablist'
      accessibilityLabel='Основная навигация'
      className='flex-row items-stretch justify-around bg-white dark:bg-neutral-800'
      style={{ paddingBottom: insets.bottom }}
    >
      {TABS.map(tab => {
        // Как на сайте: «Главная» подсвечена только на самой главной, а не в
        // каталоге, открытом из неё.
        const isActive =
          tab.routeName === '(home)'
            ? focusedRouteName === tab.routeName && pathname === '/'
            : focusedRouteName === tab.routeName
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

          // Нажатие на уже открытую «Главную» (например, из каталога)
          // возвращает к самой главной: вложенный стек сам делает это по
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
            <Icon size={ICON_SIZE} color={color} />
            <Text className='text-[11px] font-medium' style={{ color }}>
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
