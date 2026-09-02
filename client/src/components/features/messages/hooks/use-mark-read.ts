'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { conversationsService } from '../services/conversations.service'

export function useMarkRead() {
  const queryClient = useQueryClient()

  const { mutate: markRead } = useMutation({
    mutationFn: (conversationId: string) => conversationsService.markRead(conversationId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
  })

  return { markRead }
}
