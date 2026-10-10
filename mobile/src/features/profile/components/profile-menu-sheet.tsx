import { type Href, useRouter } from 'expo-router'
import type { LucideIcon } from 'lucide-react-native'
import { Alert, Pressable, Text, View } from 'react-native'

import { useAuthStore } from '@/features/auth/store/auth-store'

import { BottomSheet } from '@/shared/components/bottom-sheet'
import { useSheetAction } from '@/shared/hooks/use-sheet-action'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import {
  Bell,
  CircleQuestionMark,
  Crown,
  Heart,
  Layers,
  LogOut,
  MessageCircle,
  Palette,
  Shield,
  ShieldCheck,
  User
} from '@/shared/icons/lucide'
import { openSitePage } from '@/shared/utils/open-site-page'

import { PROFILE_ROUTES, type ProfileRoute } from '../constants/profile-routes'
import { useOpenProfileSection } from '../hooks/use-open-profile-section'

type MenuTarget =
  | { kind: 'section'; route: ProfileRoute }
  // Раздел, который в приложении — отдельная вкладка.
  | { kind: 'tab'; href: Href }
  | { kind: 'site'; path: `/${string}` }

interface MenuItem {
  label: string
  icon: LucideIcon
  target: MenuTarget
}

// Те же пункты, порядок и иконки, что у ProfileMenuSheet сайта.
const ACCOUNT_ITEMS: readonly MenuItem[] = [
  { label: 'Личные данные', icon: User, target: { kind: 'section', route: PROFILE_ROUTES.general } },
  { label: 'Безопасность', icon: Shield, target: { kind: 'section', route: PROFILE_ROUTES.security } },
  { label: 'Мои объявления', icon: Layers, target: { kind: 'tab', href: '/my-ads' } },
  { label: 'Сообщения', icon: MessageCircle, target: { kind: 'tab', href: '/messages' } },
  { label: 'Избранное', icon: Heart, target: { kind: 'tab', href: '/favorites' } },
  { label: 'Уведомления', icon: Bell, target: { kind: 'section', route: PROFILE_ROUTES.notifications } },
  { label: 'Персонализация', icon: Palette, target: { kind: 'section', route: PROFILE_ROUTES.personalization } }
]

const PREMIUM_ITEM: MenuItem = {
  label: 'Премиум',
  icon: Crown,
  target: { kind: 'section', route: PROFILE_ROUTES.premium }
}

const INFO_ITEMS: readonly MenuItem[] = [
  { label: 'Помощь', icon: CircleQuestionMark, target: { kind: 'site', path: '/help' } },
  { label: 'Правила безопасности', icon: ShieldCheck, target: { kind: 'site', path: '/safety' } }
]

const ICON_SIZE = 20
const PREMIUM_COLOR = '#ff6900'

interface ProfileMenuSheetProps {
  visible: boolean
  onClose: () => void
}

// Меню профиля — копия ProfileMenuSheet сайта (шторка почти во весь экран).
// В конце — «Выйти»: на сайте выход в шапке, а у приложения шапки нет.
export function ProfileMenuSheet({ visible, onClose }: ProfileMenuSheetProps) {
  const router = useRouter()
  const openSection = useOpenProfileSection()
  const signOut = useAuthStore(state => state.signOut)
  const iconColor = useThemeColor('--color-gray-400')
  const { runAction, onDismiss } = useSheetAction(onClose)

  const open = (target: MenuTarget) => {
    switch (target.kind) {
      case 'section':
        return openSection(target.route)
      case 'tab':
        return router.navigate(target.href)
      case 'site':
        return void openSitePage(target.path)
    }
  }

  const confirmSignOut = () =>
    Alert.alert('Выйти из аккаунта?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Выйти', style: 'destructive', onPress: () => void signOut() }
    ])

  const renderItem = (item: MenuItem) => {
    const Icon = item.icon
    const isPremium = item === PREMIUM_ITEM

    return (
      <Pressable
        key={item.label}
        accessibilityRole='button'
        onPress={() => runAction(() => open(item.target))}
        className='flex-row items-center gap-3 rounded-lg px-4 py-3 active:bg-gray-50'
      >
        <Icon size={ICON_SIZE} color={isPremium ? PREMIUM_COLOR : iconColor} />
        <Text className={`text-sm ${isPremium ? 'text-orange-500' : 'text-gray-900'}`}>{item.label}</Text>
      </Pressable>
    )
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} onDismiss={onDismiss} size='tall'>
      <View accessibilityLabel='Меню профиля' className='px-2'>
        {ACCOUNT_ITEMS.map(renderItem)}
        <View className='my-2 border-t border-gray-100' />
        {renderItem(PREMIUM_ITEM)}
        <View className='my-2 border-t border-gray-100' />
        {INFO_ITEMS.map(renderItem)}
        <View className='my-2 border-t border-gray-100' />
        <Pressable
          accessibilityRole='button'
          onPress={() => runAction(confirmSignOut)}
          className='flex-row items-center gap-3 rounded-lg px-4 py-3 active:bg-gray-50'
        >
          <LogOut size={ICON_SIZE} color={iconColor} />
          <Text className='text-sm text-gray-900'>Выйти</Text>
        </Pressable>
      </View>
    </BottomSheet>
  )
}
