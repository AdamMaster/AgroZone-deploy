'use client'

import { useQuery } from '@tanstack/react-query'

import { notificationsService } from '../services'

// В проекте нет вебсокетов (см. обсуждение с пользователем — их вообще
// нет ни на бэкенде, ни на клиенте), поэтому вместо пуша просто опрашиваем
// счётчик непрочитанных с интервалом. Раз в минуту достаточно —
// уведомление не настолько срочное, чтобы оправдывать более частый опрос.
const POLL_INTERVAL_MS = 60_000

export function useUnreadNotificationsCount() {
  const { data } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsService.countUnread(),
    refetchInterval: POLL_INTERVAL_MS
  })

  return { unreadCount: data?.count ?? 0 }
}
