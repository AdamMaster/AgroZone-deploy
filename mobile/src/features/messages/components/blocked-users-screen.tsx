import { Pressable, ScrollView, Text, View } from 'react-native'

import { Avatar } from '@/shared/components/avatar'
import { BackButton } from '@/shared/components/back-button'
import { Heading } from '@/shared/components/heading'
import { QueryState } from '@/shared/components/query-state'

import { useBlockedUsers, useUnblockUser } from '../hooks/use-conversations'

// «Черный список» — как BlockedUsersList сайта.
export function BlockedUsersScreen() {
  const blockedUsersQuery = useBlockedUsers()
  const { mutate: unblockUser, isPending: isUnblocking } = useUnblockUser()

  return (
    <ScrollView contentContainerClassName='px-4 pb-10'>
      <View className='-mx-4 mb-6 flex-row items-center gap-3'>
        <BackButton />
        <Heading level={2}>Черный список</Heading>
      </View>

      <QueryState query={blockedUsersQuery} errorTitle='Не удалось загрузить список'>
        {blockedUsers =>
          blockedUsers.length === 0 ? (
            <Text className='text-sm text-gray-500'>
              Вы никого не заблокировали. Заблокировать пользователя можно из меню рядом с диалогом на странице
              «Сообщения».
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
          )
        }
      </QueryState>
    </ScrollView>
  )
}
