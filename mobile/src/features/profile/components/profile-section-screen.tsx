import { type ReactNode, useState } from 'react'
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, View } from 'react-native'

import { useUnreadNotificationsCount } from '@/features/notifications/hooks/use-notifications'

import { CountBadge } from '@/shared/components/count-badge'
import { Heading } from '@/shared/components/heading'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Bell, Menu } from '@/shared/icons/lucide'

import { PROFILE_ROUTES } from '../constants/profile-routes'
import { useOpenProfileSection } from '../hooks/use-open-profile-section'
import { ProfileMenuSheet } from './profile-menu-sheet'

interface ProfileSectionScreenProps {
  title: string
  children: ReactNode
  // Потянуть вниз — обновить данные раздела.
  onRefresh?: () => Promise<unknown>
}

// Экран раздела профиля — как страницы /profile/settings/* сайта на
// телефоне: заголовок раздела, справа колокольчик уведомлений и меню
// профиля (шапка сайта в этом разделе), ниже — содержимое.
export function ProfileSectionScreen({ title, children, onRefresh }: ProfileSectionScreenProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const unreadCount = useUnreadNotificationsCount()
  const openSection = useOpenProfileSection()
  const iconColor = useThemeColor('--color-gray-700')

  const refresh = async () => {
    if (!onRefresh) return

    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className='flex-1'>
      <ScrollView
        keyboardShouldPersistTaps='handled'
        contentContainerClassName='px-4 pt-3 pb-10'
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => void refresh()}
              colorsClassName='accent-primary'
              tintColorClassName='accent-primary'
            />
          ) : undefined
        }
      >
        <View className='mb-6 flex-row items-center gap-4'>
          <View className='flex-1'>
            <Heading level={2}>{title}</Heading>
          </View>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel={unreadCount > 0 ? `Уведомления, непрочитанных: ${unreadCount}` : 'Уведомления'}
            hitSlop={8}
            onPress={() => openSection(PROFILE_ROUTES.notifications)}
          >
            <Bell size={24} color={iconColor} />
            <CountBadge count={unreadCount} />
          </Pressable>
          <Pressable
            accessibilityRole='button'
            accessibilityLabel='Меню профиля'
            hitSlop={8}
            onPress={() => setIsMenuOpen(true)}
          >
            <Menu size={24} color={iconColor} />
          </Pressable>
        </View>

        {children}
      </ScrollView>

      <ProfileMenuSheet visible={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </KeyboardAvoidingView>
  )
}
