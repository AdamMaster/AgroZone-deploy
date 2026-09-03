'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { supportService } from '../services/support.service'

export function useMarkSupportAdminConversationRead() {
  const queryClient = useQueryClient()

  const { mutate: markRead } = useMutation({
    mutationFn: (conversationId: string) => supportService.markAdminConversationRead(conversationId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-admin-conversations'] })
    }
  })

  return { markRead }
}
