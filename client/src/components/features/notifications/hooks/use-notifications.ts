'use client'

import { useQuery } from '@tanstack/react-query'

import { notificationsService } from '../services'
import { IFindNotificationsParams, INotification } from '../types/notification.types'

// params — часть ключа кэша, поэтому дропдаун в шапке (без параметров, т.е.
// первые 20 по умолчанию — см. FindNotificationsQueryDto на бэкенде) и
// страница "Все уведомления" (запрашивает limit побольше, см.
// ContentNotifications) не конфликтуют за один и тот же кэш.
export function useNotifications(params?: IFindNotificationsParams) {
  const { data, isLoading } = useQuery<INotification[]>({
    queryKey: ['notifications', params],
    queryFn: () => notificationsService.findMy(params)
  })

  return { notifications: data ?? [], isLoadingNotifications: isLoading }
}
