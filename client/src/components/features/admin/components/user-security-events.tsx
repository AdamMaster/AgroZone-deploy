'use client'

import { useState } from 'react'

import { Button } from '@/components/ui'

import { SecurityEventsPanel } from '../../security-events/components'
import { SECURITY_EVENT_GROUPS, SecurityEventGroup } from '../../security-events/constants/security-event.constants'
import { useAdminUserSecurityEvents } from '../../security-events/hooks'
import { ADMIN_BUTTON_CLASS, getAdminChipClassName } from '../constants/admin-ui.constants'

interface UserSecurityEventsProps {
  userId: string
}

// Журнал событий безопасности на карточке пользователя (/admin/users/:id):
// смена пароля/почты/телефона, входы с новых устройств, действия админов и
// системы — с IP и устройством, чтобы разбирать обращения вида "меня
// взломали" / "я не менял почту". Для пользователя тот же журнал показан
// в настройках безопасности (см. MySecurityEvents), но без служебных полей.
export const UserSecurityEvents = ({ userId }: UserSecurityEventsProps) => {
  const [group, setGroup] = useState<SecurityEventGroup>(SECURITY_EVENT_GROUPS[0])
  const { events, total, isLoading, isError, isRefreshing, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useAdminUserSecurityEvents(userId, group.types)

  return (
    <SecurityEventsPanel
      variant='dark'
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
      getChipClassName={getAdminChipClassName}
      renderLoadMore={({ onClick, disabled, label }) => (
        <Button type='button' size='sm' className={ADMIN_BUTTON_CLASS} onClick={onClick} disabled={disabled}>
          {label}
        </Button>
      )}
      emptyText='Событий нет.'
    />
  )
}
