'use client'

import { useRouter } from 'next/navigation'

import { Button, ButtonBack, Heading, Loading } from '@/components/ui'
import { UserAvatar } from '@/components/features/user/components'

import { useBlockedUsers, useUnblockUser } from '../hooks'

export const BlockedUsersList = () => {
  const { blockedUsers, isLoading } = useBlockedUsers()
  const { unblockUser, isUnblocking } = useUnblockUser()
  const router = useRouter()

  return (
    <div className='h-full max-w-[800px]'>
      <div className='mb-6 flex items-center gap-3'>
        <ButtonBack onClick={() => router.back()} />
        <Heading level={2}>Черный список</Heading>
      </div>

      <div className='relative flex h-full w-full flex-col gap-4 overflow-hidden'>
        {isLoading && <Loading />}

        {!isLoading && blockedUsers.length === 0 && (
          <div className='text-sm text-gray-500'>
            Вы никого не заблокировали. Заблокировать пользователя можно из меню рядом с диалогом на странице
            &quot;Сообщения&quot;.
          </div>
        )}

        {blockedUsers.map(user => (
          <div key={user.id} className='flex items-center gap-3'>
            <UserAvatar user={user} />

            <p className='min-w-0 flex-1 truncate text-sm font-medium'>{user.displayName ?? 'Пользователь'}</p>

            <Button
              type='button'
              variant='ghost'
              size='default'
              disabled={isUnblocking}
              onClick={() => unblockUser(user.id)}
            >
              Разблокировать
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
