import { useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'

import { Avatar } from '@/shared/components/avatar'
import { Heading } from '@/shared/components/heading'
import { ScreenMessage } from '@/shared/components/screen-message'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ArrowLeft } from '@/shared/icons/lucide'

import { useBlockedUsers, useUnblockUser } from '../hooks/use-conversations'

// «Черный список» — как BlockedUsersList сайта.
export function BlockedUsersScreen() {
  const router = useRouter()
  const iconColor = useThemeColor('--color-gray-900')
  const { data: blockedUsers, error, isPending, refetch } = useBlockedUsers()
  const { mutate: unblockUser, isPending: isUnblocking } = useUnblockUser()

  return (
    <ScrollView contentContainerClassName='px-4 pt-3 pb-10'>
      <View className='mb-6 flex-row items-center gap-1'>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Назад'
          onPress={() => router.back()}
          className='-ml-2 size-10 items-center justify-center rounded-lg active:bg-gray-100'
        >
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Heading level={2}>Черный список</Heading>
      </View>

      {isPending ? (
        <View className='items-center py-10'>
          <ActivityIndicator colorClassName='accent-primary' />
        </View>
      ) : !blockedUsers ? (
        <ScreenMessage
          title='Не удалось загрузить список'
          description={error?.message}
          action={{ title: 'Повторить', onPress: () => void refetch() }}
        />
      ) : blockedUsers.length === 0 ? (
        <Text className='text-sm text-gray-500'>
          Вы никого не заблокировали. Заблокировать пользователя можно из меню рядом с диалогом на странице «Сообщения».
        </Text>
      ) : (
        <View className='gap-4'>
          {blockedUsers.map(user => (
            <View key={user.id} className='flex-row items-center gap-3'>
              <Avatar name={user.displayName} pictureUrl={user.picture} colorSeed={user.id} size='base' />
              <Text numberOfLines={1} className='min-w-0 flex-1 text-sm font-medium text-gray-900'>
                {user.displayName ?? 'Пользователь'}
              </Text>
              <Pressable
                accessibilityRole='button'
                disabled={isUnblocking}
                onPress={() => unblockUser(user.id)}
                className='h-10 justify-center rounded-lg px-4 active:bg-gray-100 disabled:opacity-50'
              >
                <Text className='text-sm font-medium text-gray-900'>Разблокировать</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}
