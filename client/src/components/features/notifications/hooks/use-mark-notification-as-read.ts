'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { notificationsService } from '../services'

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient()

  const { mutate: markAsRead } = useMutation({
    mutationFn: (id: string) => notificationsService.markAsRead(id),

    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    }
  })

  return { markAsRead }
}
