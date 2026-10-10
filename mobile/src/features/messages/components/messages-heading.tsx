import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { ActionSheet } from '@/shared/components/action-sheet'
import { Heading } from '@/shared/components/heading'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Ellipsis } from '@/shared/icons/lucide'

// Заголовок раздела «Сообщения» с меню «…» → «Черный список», как у
// MessagesClient сайта (он остаётся и над открытой перепиской).
export function MessagesHeading() {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const iconColor = useThemeColor('--color-gray-900')

  return (
    <View className='mb-6 flex-row items-center justify-between'>
      <Heading level={2}>Сообщения</Heading>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Ещё'
        onPress={() => setIsMenuOpen(true)}
        className='size-9 items-center justify-center rounded-lg active:bg-gray-100'
      >
        <Ellipsis size={20} color={iconColor} />
      </Pressable>
      <ActionSheet
        visible={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        actions={[{ key: 'blocked', label: 'Черный список', onPress: () => router.navigate('/messages/blocked') }]}
      />
    </View>
  )
}
