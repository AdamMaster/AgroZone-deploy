import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuthStore } from '@/features/auth/store/auth-store'

import { notificationsApi } from '../api/notifications.api'

// Сколько уведомлений показывает раздел «Уведомления» — как на сайте.
const NOTIFICATIONS_LIMIT = 50
// Вебсокетов в проекте нет, поэтому счётчик непрочитанных опрашивается —
// раз в минуту, как на сайте: уведомления не настолько срочные.
const UNREAD_COUNT_POLL_INTERVAL_MS = 60_000

const notificationsQueryKey = ['notifications'] as const
const notificationsListQueryKey = [...notificationsQueryKey, 'list'] as const
const unreadCountQueryKey = [...notificationsQueryKey, 'unread-count'] as const

export function useNotifications() {
  return useQuery({
    queryKey: notificationsListQueryKey,
    queryFn: ({ signal }) => notificationsApi.list(NOTIFICATIONS_LIMIT, signal)
  })
}

// Счётчик на колокольчике и вкладке «Профиль». Только для вошедшего; пока
// приложение в фоне, react-query опрос не делает, а при возвращении сразу
// обновляет (use-react-query-native-managers.ts).
export function useUnreadNotificationsCount(): number {
  const isSignedIn = useAuthStore(state => state.status === 'signedIn')

  const { data } = useQuery({
    queryKey: unreadCountQueryKey,
    queryFn: ({ signal }) => notificationsApi.unreadCount(signal),
    enabled: isSignedIn,
    refetchInterval: UNREAD_COUNT_POLL_INTERVAL_MS
  })

  return isSignedIn ? (data?.count ?? 0) : 0
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationsQueryKey })
  })
}
