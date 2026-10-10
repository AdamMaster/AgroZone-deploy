import { ActivityIndicator, Pressable, View } from 'react-native'

import type { UserProfile } from '@/features/auth/types/auth.types'

import { Avatar } from '@/shared/components/avatar'
import { Camera } from '@/shared/icons/lucide'

import { useUpdateAvatar } from '../hooks/use-profile-mutations'
import { pickAvatarImage, pickFileThen } from '../lib/pick-files'

// Фото профиля: нажатие открывает галерею, выбранное фото сразу
// загружается — как аватар в «Личных данных» сайта (там значок камеры при
// наведении, здесь — пока палец на фото).
export function ProfileAvatarPicker({ profile }: { profile: UserProfile }) {
  const { mutate: updateAvatar, isPending } = useUpdateAvatar()

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel='Изменить фото профиля'
      accessibilityState={{ busy: isPending }}
      disabled={isPending}
      onPress={() => void pickFileThen(pickAvatarImage, file => updateAvatar(file))}
      className='self-start overflow-hidden rounded-full'
    >
      {({ pressed }) => (
        <View>
          <Avatar name={profile.displayName} pictureUrl={profile.picture} size='lg' colorSeed={profile.id} />
          {pressed && !isPending && (
            <View className='absolute inset-0 items-center justify-center bg-black/40'>
              <Camera size={24} color='#ffffff' />
            </View>
          )}
          {isPending && (
            <View className='absolute inset-0 items-center justify-center bg-white/80'>
              <ActivityIndicator colorClassName='accent-primary' />
            </View>
          )}
        </View>
      )}
    </Pressable>
  )
}
