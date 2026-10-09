import { useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'

import { useProfile } from '@/features/auth/hooks/use-profile'
import { useAuthStore } from '@/features/auth/store/auth-store'

import { Avatar } from '@/shared/components/avatar'
import { Button } from '@/shared/components/button'
import { ScreenMessage } from '@/shared/components/screen-message'
import { formatPhoneForDisplay } from '@/shared/utils/phone'

export function ProfileOverview() {
  const router = useRouter()
  const signOut = useAuthStore(state => state.signOut)
  const { data: profile, error, isPending, refetch } = useProfile()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const confirmSignOut = () =>
    Alert.alert('Выйти из аккаунта?', undefined, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Выйти',
        style: 'destructive',
        onPress: () => {
          setIsSigningOut(true)
          void signOut()
        }
      }
    ])

  if (isPending) {
    return (
      <View className='flex-1 items-center justify-center'>
        <ActivityIndicator colorClassName='accent-primary' />
      </View>
    )
  }

  if (!profile) {
    return (
      <ScreenMessage
        title='Не удалось загрузить профиль'
        description={error?.message}
        action={{ title: 'Повторить', onPress: () => void refetch() }}
      />
    )
  }

  return (
    <ScrollView contentContainerClassName='gap-8 p-5' contentInsetAdjustmentBehavior='automatic'>
      <View className='items-center gap-3'>
        <Avatar name={profile.displayName} pictureUrl={profile.picture} size='lg' />
        <Text className='text-center text-xl font-semibold text-foreground'>{profile.displayName || 'Без имени'}</Text>
        <View className='items-center gap-1'>
          {profile.primaryPhone && (
            <Text className='text-sm text-muted-foreground'>{formatPhoneForDisplay(profile.primaryPhone)}</Text>
          )}
          {profile.email && <Text className='text-sm text-muted-foreground'>{profile.email}</Text>}
        </View>
      </View>

      <Button title='Выйти' variant='outline' isLoading={isSigningOut} onPress={confirmSignOut} />

      <Pressable
        accessibilityRole='button'
        hitSlop={8}
        className='self-center'
        onPress={() => router.push('/delete-account')}
      >
        <Text className='text-sm font-medium text-destructive'>Удалить аккаунт</Text>
      </Pressable>
    </ScrollView>
  )
}
