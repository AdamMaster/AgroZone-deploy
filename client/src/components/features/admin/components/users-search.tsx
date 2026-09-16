'use client'

import { Search } from 'lucide-react'
import Link from 'next/link'

import { UserAvatar } from '@/components/features/user/components'
import { Button, Input } from '@/components/ui'

import { USER_TYPE_LABELS } from '@/shared/constants/user-types'
import { formatFullDate, formatPhoneNumber, pluralizeRu } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { ADMIN_BUTTON_CLASS } from '../constants/admin-ui.constants'
import { useAdminUsersSearch } from '../hooks'
import { UserBadges } from './user-badges'

// Поиск пользователей для админки (/admin/users) — одна строка сразу по
// имени/email/телефону (см. UserService.searchByAdmin на бэкенде), список
// строк с переходом на полную карточку (/admin/users/:id, см.
// UserAdminDetail). Пустой запрос — не пустое состояние, а весь список,
// последние зарегистрированные сверху (см. useAdminUsersSearch).
export const UsersSearch = () => {
  const { query, setQuery, users, total, isLoading, isRefetching, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useAdminUsersSearch()

  return (
    <div className='py-6 text-neutral-50'>
      <div className='relative mb-4 max-w-md'>
        <Search className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400' />
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='Имя, email или телефон'
          className='rounded-md border-none bg-neutral-700 pl-9 placeholder:text-neutral-400 hover:bg-neutral-600 focus-visible:bg-neutral-600'
        />
      </div>

      {isLoading && <p className='text-sm'>Загрузка...</p>}

      {!isLoading && (
        <p className='mb-3 text-xs text-neutral-400'>
          {total > 0
            ? `Найдено: ${total}${isRefetching ? ' · обновляем…' : ''}`
            : query.trim()
              ? 'Никого не нашли по этому запросу.'
              : 'Пользователей пока нет.'}
        </p>
      )}

      <div className='flex flex-col gap-2'>
        {users.map(user => {
          const primaryPhone = user.phones[0]?.phone

          return (
            <Link
              key={user.id}
              href={`/admin/users/${user.id}`}
              className='flex items-center gap-3 rounded-md bg-neutral-600/30 p-3 hover:bg-neutral-600/50'
            >
              <UserAvatar user={user} />

              <div className='min-w-0 flex-1'>
                <div className='flex flex-wrap items-center gap-2'>
                  <span className='truncate font-medium'>{user.displayName || 'Без имени'}</span>
                  <UserBadges role={user.role} premiumUntil={user.premiumUntil} deletedAt={user.deletedAt} />
                </div>

                <p className='truncate text-sm text-neutral-300'>
                  {[user.email, primaryPhone ? formatPhoneNumber(primaryPhone) : null].filter(Boolean).join(' · ') ||
                    '—'}
                </p>

                <p className='mt-0.5 text-xs text-neutral-400'>
                  {USER_TYPE_LABELS[user.type]} · с {formatFullDate(user.createdAt)} · {user._count.ads}{' '}
                  {pluralizeRu(user._count.ads, ['объявление', 'объявления', 'объявлений'])}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      {hasNextPage && (
        <div className='mt-4 flex justify-center'>
          <Button
            type='button'
            size='sm'
            className={cn(ADMIN_BUTTON_CLASS)}
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
          >
            {isFetchingNextPage ? 'Загружаем...' : 'Показать ещё'}
          </Button>
        </div>
      )}
    </div>
  )
}
