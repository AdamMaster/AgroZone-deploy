import { useRouter } from 'expo-router'
import { Pressable, Text } from 'react-native'

import { Avatar } from '@/shared/components/avatar'

import { useProfile } from '../hooks/use-profile'
import { useAuthStore } from '../store/auth-store'

// Кнопка в шапке главного экрана: «Войти» или аватар, ведущий в профиль.
export function AccountHeaderButton() {
  const router = useRouter()
  const isSignedIn = useAuthStore(state => state.status === 'signedIn')
  const { data: profile } = useProfile()

  if (!isSignedIn) {
    return (
      <Pressable accessibilityRole='button' hitSlop={8} onPress={() => router.push('/login')}>
        <Text className='text-base font-semibold text-primary'>Войти</Text>
      </Pressable>
    )
  }

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel='Профиль'
      hitSlop={8}
      onPress={() => router.push('/profile')}
    >
      <Avatar name={profile?.displayName ?? null} pictureUrl={profile?.picture ?? null} size='sm' />
    </Pressable>
  )
}
