'use client'

import { useState } from 'react'

import { Button } from '@/components/ui'

import { cn } from '@/lib/utils'

import { SECURITY_EVENT_GROUPS, SecurityEventGroup } from '../constants/security-event.constants'
import { useMySecurityEvents } from '../hooks'
import { SecurityEventsPanel } from './security-events-panel'

const getChipClassName = (isActive: boolean) =>
  cn(
    'rounded-full border px-3 py-1 text-sm transition-colors',
    isActive ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
  )

// "Недавняя активность" в настройках безопасности: пользователь сам видит,
// что и откуда менялось в его аккаунте (пароль, почта, телефон, вход с
// нового устройства), и может заметить чужие действия. Данные — тот же
// журнал, что видит админ, но без служебных полей (см.
// SecurityEventForUser на бэкенде).
export const MySecurityEvents = () => {
  const [group, setGroup] = useState<SecurityEventGroup>(SECURITY_EVENT_GROUPS[0])
  const { events, total, isLoading, isError, isRefreshing, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useMySecurityEvents(group.types)

  return (
    <SecurityEventsPanel
      variant='light'
      events={events}
      total={total}
      isLoading={isLoading}
      isError={isError}
      isRefreshing={isRefreshing}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={() => fetchNextPage()}
      activeGroupId={group.id}
      onGroupChange={setGroup}
      getChipClassName={getChipClassName}
      renderLoadMore={({ onClick, disabled, label }) => (
        <Button type='button' variant='ghost' size='sm' onClick={onClick} disabled={disabled}>
          {label}
        </Button>
      )}
      emptyText='Событий пока нет.'
    />
  )
}
