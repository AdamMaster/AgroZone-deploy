'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { notificationsService } from '../services'

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient()

  const { mutate: markAllAsRead, isPending: isMarkingAllAsRead } = useMutation({
    mutationFn: () => notificationsService.markAllAsRead(),

    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    }
  })

  return { markAllAsRead, isMarkingAllAsRead }
}
